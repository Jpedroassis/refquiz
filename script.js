 const STORAGE_KEY = 'answeredQuestions';
    const SCORE_KEY = 'quizScore';
    const WRONG_KEY = 'wrongAnswers';
    const RETRY_KEY = 'retryMode';
    let questions = [];

    async function loadQuestions() {
      const response = await fetch('questions.md');
      const markdown = await response.text();
      const lines = markdown.split('\n');
      const parsed = [];
      let current = null;

      lines.forEach(line => {
        if (line.startsWith('### ')) {
          if (current) parsed.push(current);
          current = {
            id: parsed.length + 1,
            question: line.replace('### ', '').trim(),
            options: [],
            correctIndex: -1
          };
        } else if (line.startsWith('- ')) {
          const isCorrect = line.includes('[x]');
          const text = line.replace(/- \[.\] /, '').trim();
          current.options.push(text);
          if (isCorrect) current.correctIndex = current.options.length - 1;
        }
      });

      if (current) parsed.push(current);
      questions = parsed;
      showRandomQuestion();
      showScore();
    }

    function getAnsweredIds() {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }

    function getWrongAnswers() {
      const data = localStorage.getItem(WRONG_KEY);
      return data ? JSON.parse(data) : [];
    }

    function saveAnsweredId(id, correct) {
      const answered = getAnsweredIds();
      if (!answered.includes(id)) answered.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answered));

      const wrong = getWrongAnswers();
      if (!correct && !wrong.includes(id)) {
        wrong.push(id);
        localStorage.setItem(WRONG_KEY, JSON.stringify(wrong));
      } else if (correct && wrong.includes(id)) {
        const updatedWrong = wrong.filter(w => w !== id);
        localStorage.setItem(WRONG_KEY, JSON.stringify(updatedWrong));
      }

      if (correct) updateScore();
    }

    function getScore() {
      return parseInt(localStorage.getItem(SCORE_KEY)) || 0;
    }

    function updateScore(increment = 1) {
      const currentScore = getScore();
      const newScore = currentScore + increment;
      localStorage.setItem(SCORE_KEY, newScore);
    }

    function showScore() {
      const scoreBox = document.getElementById('scoreBox');
      const total = getAnsweredIds().length;
      const score = getScore();
      scoreBox.innerText = `Pontuação: ${score} / ${total}`;
    }

    function getUnansweredQuestions() {
      const retry = JSON.parse(localStorage.getItem(RETRY_KEY) || 'null');
      const answered = getAnsweredIds();
      if (retry && Array.isArray(retry)) {
        return questions.filter(q => retry.includes(q.id) && !answered.includes(q.id));
      }
      return questions.filter(q => !answered.includes(q.id));
    }

    function showRandomQuestion() {
      const remaining = getUnansweredQuestions();
      const box = document.getElementById('questionBox');
      const feedback = document.getElementById('feedback');
      feedback.innerText = '';

      if (remaining.length === 0) {
        document.getElementById('questionText').innerText = 'Você respondeu todas as perguntas!';
        document.getElementById('optionsList').innerHTML = '';
        document.getElementById('nextButton').disabled = true;
        showScore();
        showRestartOptions();
        return;
      }

      const random = remaining[Math.floor(Math.random() * remaining.length)];
      document.getElementById('questionText').innerText = random.question;
      document.getElementById('optionsList').innerHTML = '';

      random.options.forEach((option, index) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.innerText = option;
        btn.onclick = () => {
          const isCorrect = index === random.correctIndex;
          feedback.innerText = isCorrect
            ? '✅ Correto!'
            : `❌ Errado. A resposta correta era: ${random.options[random.correctIndex]}`;

          saveAnsweredId(random.id, isCorrect);
          showScore();

          const allButtons = document.querySelectorAll('#optionsList button');
          allButtons.forEach((b, i) => {
            b.disabled = true;
            b.classList.remove('selected', 'correct', 'incorrect');
            if (i === random.correctIndex) b.classList.add('correct');
            if (i === index && !isCorrect) b.classList.add('incorrect');
          });

          btn.classList.add('selected');
        };

        li.appendChild(btn);
        document.getElementById('optionsList').appendChild(li);
      });

      document.getElementById('questionBox').dataset.currentId = random.id;
    }

    function showRestartOptions() {
      const box = document.getElementById('questionBox');
      const existing = document.getElementById('restartButtons');
      if (existing) existing.remove();

      const restartButtons = document.createElement('div');
      restartButtons.id = 'restartButtons';

      const resetAll = document.createElement('button');
      resetAll.innerText = '🔁 Recomeçar todas as perguntas';
      resetAll.onclick = () => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SCORE_KEY);
        localStorage.removeItem(WRONG_KEY);
        localStorage.removeItem(RETRY_KEY);
        document.getElementById('nextButton').disabled = false;
        showScore();
        showRandomQuestion();
      };

      const retryWrong = document.createElement('button');
      retryWrong.innerText = '🔄 Tentar novamente apenas as erradas';
      retryWrong.onclick = () => {
        const wrongIds = getWrongAnswers();
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        localStorage.setItem(RETRY_KEY, JSON.stringify(wrongIds));
        localStorage.removeItem(SCORE_KEY);
        localStorage.removeItem(WRONG_KEY);
        document.getElementById('nextButton').disabled = false;
        showScore();
        showRandomQuestion();
      };

      restartButtons.appendChild(resetAll);
      restartButtons.appendChild(document.createTextNode(' '));
      restartButtons.appendChild(retryWrong);
      box.appendChild(restartButtons);
    }

    document.getElementById('nextButton').addEventListener('click', showRandomQuestion);

    document.getElementById('clearProgress').onclick = () => {
      if (confirm('Tem certeza de que deseja apagar todo o progresso?')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SCORE_KEY);
        localStorage.removeItem(WRONG_KEY);
        localStorage.removeItem(RETRY_KEY);
        document.getElementById('nextButton').disabled = false;
        showScore();
        showRandomQuestion();
      }
    };

    loadQuestions();