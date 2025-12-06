const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    const username = await question('Введите имя пользователя: ');
    const password = await question('Введите пароль: ');
    
    if (!username || !password) {
      console.log('Имя пользователя и пароль обязательны!');
      rl.close();
      return;
    }

    if (password.length < 6) {
      console.log('Пароль должен быть не менее 6 символов!');
      rl.close();
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('\nSQL запрос для создания администратора:');
    console.log('----------------------------------------');
    console.log(`INSERT INTO users (username, password, "isAdmin", "isBlocked", "createdAt")`);
    console.log(`VALUES ('${username}', '${hashedPassword}', true, false, NOW());`);
    console.log('----------------------------------------\n');
    console.log('Выполните этот запрос в базе данных PostgreSQL');
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  } finally {
    rl.close();
  }
}

createAdmin();




