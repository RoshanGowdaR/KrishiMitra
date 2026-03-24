import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { getQuizzes } from '../services/api';

function ScoreScreen({ score, total, onTryAgain, onBack, t }) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= 60;

  return (
    <section className="panel quiz-score-screen">
      <h3>{t('quiz.complete')}</h3>
      <p className="quiz-score-value">{percentage}%</p>
      <span className={passed ? 'difficulty-badge beginner' : 'difficulty-badge advanced'}>
        {passed ? t('quiz.pass') : t('quiz.fail')}
      </span>
      <p>
        {t('quiz.scoreText', { score, total })}
      </p>
      <div className="quiz-score-actions">
        <button type="button" className="primary-btn" onClick={onTryAgain}>{t('quiz.tryAgain')}</button>
        <button type="button" className="ghost-btn" onClick={onBack}>{t('quiz.backToQuizzes')}</button>
      </div>
    </section>
  );
}

function QuizList({ quizzes, onStart, t }) {
  return (
    <div className="quiz-grid">
      {quizzes.map((quiz) => (
        <article key={quiz.id} className="quiz-card">
          <div className="quiz-card-head">
            <span className="quiz-category-badge">{quiz.category || 'general'}</span>
            <span className={
              quiz.difficulty === 'advanced'
                ? 'difficulty-badge advanced'
                : quiz.difficulty === 'intermediate'
                  ? 'difficulty-badge intermediate'
                  : 'difficulty-badge beginner'
            }
            >
              {quiz.difficulty || 'beginner'}
            </span>
          </div>
          <h3>{quiz.title}</h3>
          <p>{t('quiz.questionsCount', { count: quiz.questions?.length || 0 })}</p>
          <button type="button" className="primary-btn" onClick={() => onStart(quiz)}>{t('quiz.startQuiz')}</button>
        </article>
      ))}
    </div>
  );
}

function QuizMode({
  quiz,
  currentQ,
  selected,
  showExplanation,
  onSelect,
  onNext,
  t,
}) {
  const question = quiz.questions[currentQ];
  const total = quiz.questions.length;
  const progress = Math.round(((currentQ + 1) / total) * 100);

  return (
    <section className="panel quiz-mode">
      <div className="quiz-progress-wrap">
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>{currentQ + 1}/{total}</span>
      </div>

      <h3>{question.question}</h3>

      <div className="quiz-options-grid">
        {question.options.map((option) => {
          const isCorrect = option === question.correct_answer;
          const isSelected = selected === option;

          let optionClass = 'quiz-option';
          if (selected !== null) {
            if (isCorrect) optionClass += ' correct';
            else if (isSelected) optionClass += ' wrong';
          }

          return (
            <button
              key={option}
              type="button"
              className={optionClass}
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showExplanation ? (
        <div className="quiz-explanation">
          <strong>{selected === question.correct_answer ? t('quiz.correct') : t('quiz.notQuite')}</strong>
          <p>{question.explanation || t('quiz.reviewConcept')}</p>
        </div>
      ) : null}

      {selected !== null ? (
        <button type="button" className="primary-btn" onClick={onNext}>{t('quiz.nextQuestion')}</button>
      ) : null}
    </section>
  );
}

export default function Quiz() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setLoading(true);
    getQuizzes({ language })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.quizzes || [];
        const rank = { beginner: 0, intermediate: 1, advanced: 2 };
        const sorted = [...list].sort((a, b) => (rank[a.difficulty] ?? 9) - (rank[b.difficulty] ?? 9));
        setQuizzes(sorted);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError(t('quiz.failed'));
      });
  }, [t, language]);

  const totalQuestions = useMemo(
    () => activeQuiz?.questions?.length || 0,
    [activeQuiz?.questions?.length]
  );

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQ(0);
    setSelected(null);
    setShowExplanation(false);
    setScore(0);
    setFinished(false);
  };

  const selectAnswer = (option) => {
    if (selected !== null || !activeQuiz) {
      return;
    }

    const question = activeQuiz.questions[currentQ];
    setSelected(option);
    setShowExplanation(true);

    if (option === question.correct_answer) {
      setScore((prev) => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (!activeQuiz) {
      return;
    }

    const atLastQuestion = currentQ >= activeQuiz.questions.length - 1;
    if (atLastQuestion) {
      setFinished(true);
      return;
    }

    setCurrentQ((prev) => prev + 1);
    setSelected(null);
    setShowExplanation(false);
  };

  const tryAgain = () => {
    if (!activeQuiz) {
      return;
    }
    startQuiz(activeQuiz);
  };

  const backToList = () => {
    setActiveQuiz(null);
    setFinished(false);
    setSelected(null);
    setShowExplanation(false);
    setCurrentQ(0);
  };

  if (loading) return <div className="panel">{t('quiz.loading')}</div>;
  if (error) return <div className="panel">{t('quiz.error', { message: error })}</div>;

  return (
    <div className="page-wrap quiz-page">
      <h2>{t('nav.quiz', 'Farming Quiz')}</h2>

      {finished ? (
        <ScoreScreen score={score} total={totalQuestions} onTryAgain={tryAgain} onBack={backToList} t={t} />
      ) : activeQuiz ? (
        <QuizMode
          quiz={activeQuiz}
          currentQ={currentQ}
          selected={selected}
          showExplanation={showExplanation}
          onSelect={selectAnswer}
          onNext={nextQuestion}
          t={t}
        />
      ) : (
        <QuizList quizzes={quizzes} onStart={startQuiz} t={t} />
      )}
    </div>
  );
}
