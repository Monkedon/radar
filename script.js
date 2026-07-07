// Встав сюди своє повне посилання на вебхук Discord всередині лапок:
const WEBHOOK_URL = "https://discord.com/api/webhooks/1524070264948789539/rCT3EHkSXqEEBDyFl-iTTLIAxbkc4uEFfxJjzMcJ4aS2VHoFeRqjUySMp3zfSXMC6qsj";

// Як тільки сторінка завантажилася, перевіряємо, чи є вже збережене ім'я
document.addEventListener("DOMContentLoaded", () => {
    const savedName = localStorage.getItem("radar_username");
    if (savedName) {
        document.getElementById("username").value = savedName;
    }
});

function sendTime(minutes) {
    const usernameInput = document.getElementById("username").value.trim();
    
    if (!usernameInput) {
        alert("Будь ласка, введи своє ім'я перед відправкою!");
        return;
    }

    // Запам'ятовуємо ім'я на пристрої користувача назавжди
    localStorage.setItem("radar_username", usernameInput);

    // Рахуємо майбутній час у секундах (UNIX-таймштамп)
    // Date.now() дає мілісекунди, ділимо на 1000 і додаємо хвилини переведені в секунди
    const futureUnixTime = Math.floor(Date.now() / 1000) + (minutes * 60);

    // Формуємо повідомлення для Discord. 
    // Символи <t:ЧИСЛО:R> змушують Discord показувати живий таймер (наприклад: "через 42 хвилини")
    const messageContent = `🟢 **${usernameInput}** вільний (вийде на зв'язок <t:${futureUnixTime}:R>)`;

    // Пакуємо дані в JSON-формат, який вимагає Discord
    const payload = {
        content: messageContent
    };

    // Робимо прямий постріл у вебхук
    fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (response.ok) {
            // Якщо все гуд — показуємо мікро-сповіщення і закриваємо вікно додатка
            alert("Статус успішно оновлено!");
            window.close(); // Спрацює, якщо запущено як PWA-додаток
        } else {
            alert("Помилка відправки в Discord. Перевір вебхук.");
        }
    })
    .catch(error => {
        alert("Помилка мережі: " + error);
    });
}