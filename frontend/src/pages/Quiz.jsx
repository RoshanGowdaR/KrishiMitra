import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQuizzes } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const difficultyLabelClass = {
  beginner: 'difficulty-badge beginner',
  intermediate: 'difficulty-badge intermediate',
  advanced: 'difficulty-badge advanced',
};

export default function Quiz() {
  const { data, isLoading } = useQuery({ queryKey: ['quiz'], queryFn: () => getQuizzes({ language: 'en' }), retry: 0 });
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [answers, setAnswers] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  if (isLoading) return <LoadingSpinner />;

  const quizzes = data?.quizzes || [];
  const currentQuestion = activeQuiz?.questions?.[questionIndex];
  const progress = activeQuiz?.questions?.length
    ? Math.round(((questionIndex + 1) / activeQuiz.questions.length) * 100)
    : 0;

  const score = useMemo(() => {
    if (!activeQuiz?.questions?.length) {
      return 0;
    }

    const correctCount = answers.filter((item) => item.isCorrect).length;
    return Math.round((correctCount / activeQuiz.questions.length) * 100);
  }, [activeQuiz?.questions?.length, answers]);

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setQuestionIndex(0);
    setSelectedOption('');
    setAnswers([]);
    setIsFinished(false);
  };

  const chooseOption = (option) => {
    if (selectedOption) {
      return;
    }
    setSelectedOption(option);
  };

  const moveToNext = () => {
    if (!currentQuestion || !selectedOption) {
      return;
    }

    const isCorrect = selectedOption === currentQuestion.correct_answer;
    setAnswers((prev) => [
      ...prev,
      {
        question_id: currentQuestion.id,
        answer: selectedOption,
        isCorrect,
      },
    ]);

    if (questionIndex + 1 >= activeQuiz.questions.length) {
      setIsFinished(true);
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedOption('');
  };

  const restart = () => {
    if (!activeQuiz) {
      return;
    }
    startQuiz(activeQuiz);
  };

  return (
    <div className="page-wrap quiz-page">
      <h2>Farming Quiz</h2>

      {!activeQuiz ? (
        <div className="quiz-grid">
          {quizzes.map((quiz) => (
            <article key={quiz.id} className="quiz-card">
              <div className="quiz-card-head">
                <span className="quiz-category-badge">{quiz.category || 'General'}</span>
                <span className={difficultyLabelClass[quiz.difficulty] || 'difficulty-badge beginner'}>
                  {quiz.difficulty || 'beginner'}
                </span>
              </div>
              <h3>{quiz.title}</h3>
              <p>{quiz.questions?.length || 0} Questions</p>
              <button type="button" className="primary-btn" onClick={() => startQuiz(quiz)}>
                Start Quiz
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {activeQuiz && !isFinished && currentQuestion ? (
        <section className="panel quiz-mode">
          <div className="quiz-progress-wrap">
            <div className="quiz-progress-track">
              <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{questionIndex + 1} / {activeQuiz.questions.length}</span>
          </div>

          <h3>{currentQuestion.question}</h3>

          <div className="quiz-options-grid">
            {currentQuestion.options?.map((option) => {
              let optionClass = 'quiz-option';
              if (selectedOption) {
                if (option === currentQuestion.correct_answer) {
                  optionClass += ' correct';
                } else if (option === selectedOption) {
                  optionClass += ' wrong';
                }
              }

              return (
                <button key={option} type="button" className={optionClass} onClick={() => chooseOption(option)}>
                  {option}
                </button>
              );
            })}
          </div>

          {selectedOption ? (
            <div className="quiz-explanation">
              <strong>
                {selectedOption === currentQuestion.correct_answer ? 'Correct!' : 'Not quite.'}
              </strong>
              <p>{currentQuestion.explanation || 'Use this answer pattern to improve your next attempt.'}</p>
            </div>
          ) : null}

          <button type="button" className="primary-btn" onClick={moveToNext} disabled={!selectedOption}>
            Next
          </button>
        </section>
      ) : null}

      {activeQuiz && isFinished ? (
        <section className="panel quiz-score-screen">
          <h3>Quiz Complete</h3>
          <p className="quiz-score-value">{score}%</p>
          <p>You answered {answers.filter((item) => item.isCorrect).length} out of {activeQuiz.questions.length} correctly.</p>
          <div className="quiz-score-actions">
            <button type="button" className="primary-btn" onClick={restart}>Retry Quiz</button>
            <button type="button" className="ghost-btn" onClick={() => setActiveQuiz(null)}>Back to Quiz List</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
