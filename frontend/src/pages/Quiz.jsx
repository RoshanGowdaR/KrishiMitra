import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

function ScoreScreen({ score, total, onTryAgain, onBack }) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= 60;

  return (
    <section className="panel quiz-score-screen">
      <h3>Quiz Complete</h3>
      <p className="quiz-score-value">{percentage}%</p>
      <span className={passed ? 'difficulty-badge beginner' : 'difficulty-badge advanced'}>
        {passed ? 'Pass' : 'Fail'}
      </span>
      <p>
        You answered {score} out of {total} correctly.
      </p>
      <div className="quiz-score-actions">
        <button type="button" className="primary-btn" onClick={onTryAgain}>Try Again</button>
        <button type="button" className="ghost-btn" onClick={onBack}>Back to Quizzes</button>
      </div>
    </section>
  );
}

function QuizList({ quizzes, onStart }) {
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
          <p>{quiz.questions?.length || 0} Questions</p>
          <button type="button" className="primary-btn" onClick={() => onStart(quiz)}>Start Quiz</button>
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
          <strong>{selected === question.correct_answer ? 'Correct!' : 'Not quite.'}</strong>
          <p>{question.explanation || 'Review this concept before moving to the next question.'}</p>
        </div>
      ) : null}

      {selected !== null ? (
        <button type="button" className="primary-btn" onClick={onNext}>Next Question</button>
      ) : null}
    </section>
  );
}

export default function Quiz() {
  const { t } = useTranslation();
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
    fetch('http://127.0.0.1:8000/api/v1/quiz')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.quizzes || [];
        setQuizzes(list);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError('Failed');
      });
  }, []);

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

  if (loading) return <div className="panel">Loading...</div>;
  if (error) return <div className="panel">Error: {error}</div>;

  return (
    <div className="page-wrap quiz-page">
      <h2>{t('nav.quiz', 'Farming Quiz')}</h2>

      {finished ? (
        <ScoreScreen score={score} total={totalQuestions} onTryAgain={tryAgain} onBack={backToList} />
      ) : activeQuiz ? (
        <QuizMode
          quiz={activeQuiz}
          currentQ={currentQ}
          selected={selected}
          showExplanation={showExplanation}
          onSelect={selectAnswer}
          onNext={nextQuestion}
        />
      ) : (
        <QuizList quizzes={quizzes} onStart={startQuiz} />
      )}
    </div>
  );
}
