import pytest
from fastapi.testclient import TestClient

from app.main import app


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeTable:
    def __init__(self, db, name):
        self.db = db
        self.name = name
        self._payload = None

    def upsert(self, payload, on_conflict='id'):
        _ = on_conflict
        self._payload = payload
        return self

    def execute(self):
        payload = dict(self._payload)
        existing = next((row for row in self.db[self.name] if row.get('id') == payload.get('id')), None)
        if existing:
            existing.update(payload)
            return FakeResponse([existing])

        self.db[self.name].append(payload)
        return FakeResponse([payload])


class FakeSupabase:
    def __init__(self):
        self.db = {'users': []}

    def table(self, name):
        return FakeTable(self.db, name)


@pytest.fixture
def client(monkeypatch):
    from app.routes import auth

    fake_supabase = FakeSupabase()
    fake_user = {
        'id': 'user-1',
        'email': 'test@example.com',
        'name': 'Roshan',
        'state': 'Karnataka',
        'district': 'Mysuru',
        'preferred_language': 'kn',
    }

    monkeypatch.setattr(auth, 'get_supabase_client', lambda: fake_supabase)
    app.dependency_overrides[auth.get_current_user] = lambda: fake_user

    test_client = TestClient(app)
    test_client.fake_supabase = fake_supabase
    test_client.fake_user = fake_user

    yield test_client
    app.dependency_overrides.clear()


def test_get_me_returns_current_user(client):
    response = client.get('/api/v1/auth/me')
    assert response.status_code == 200
    data = response.json()['user']
    assert data['id'] == client.fake_user['id']
    assert data['email'] == client.fake_user['email']


def test_profile_upsert_creates_profile(client):
    payload = {
        'name': 'Roshan',
        'state': 'Karnataka',
        'district': 'Mysuru',
        'taluk': 'Mysuru',
        'village': 'Hootagalli',
        'preferred_language': 'kn',
    }

    response = client.post('/api/v1/auth/profile', json=payload)
    assert response.status_code == 200
    data = response.json()['user']
    assert data['id'] == client.fake_user['id']
    assert data['name'] == 'Roshan'


def test_profile_upsert_updates_profile(client):
    client.fake_supabase.db['users'].append({
        'id': 'user-1',
        'email': 'test@example.com',
        'name': 'Old Name',
        'state': 'Karnataka',
        'district': 'Mysuru',
        'preferred_language': 'kn',
    })

    response = client.post(
        '/api/v1/auth/profile',
        json={
            'name': 'New Name',
            'state': 'Karnataka',
            'district': 'Mandya',
            'taluk': 'Srirangapatna',
            'village': 'Belagola',
            'preferred_language': 'en',
        },
    )

    assert response.status_code == 200
    data = response.json()['user']
    assert data['name'] == 'New Name'
    assert data['district'] == 'Mandya'


def test_profile_requires_valid_payload(client):
    response = client.post('/api/v1/auth/profile', json={'name': 'Only Name'})
    assert response.status_code == 422
