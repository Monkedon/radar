const ENCODED_WEBHOOK = "aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTUyNDA3MDI2NDk0ODc4OTUzOS9yQ1QzRUhrU1hxRUVCRHlGbC1pVFRMSUF4YmtjNHVFRmZ4Smp6TWNKNGFTMlZIb0ZlUnFqVXlTTXAzemZTWE1DNnFzag=="; 

// 2. ДОВІДНИК РОЛЕЙ (Заміни цифри на реальні ID ролей із твого Discord)
const DISCORD_ROLES = {
    "ALL": "@here",                 
    "GROUP_A": "<@&123456789012345678>", 
    "GROUP_B": "<@&876543210987654321>"  
};

const getWebhookUrl = () => atob(ENCODED_WEBHOOK);

window.addEventListener('DOMContentLoaded', () => {
    // Відновлюємо нікнейм
    const savedName = localStorage.getItem("radar_username");
    if (savedName) {
        document.getElementById("username").value = savedName;
    }

    // РОЗУМНЕ ОЧИЩЕННЯ: перевіряємо, чи вийшов час слоту
    const savedMessageId = localStorage.getItem("radar_msg_id");
    const savedActiveUntil = localStorage.getItem("radar_active_until");

    if (savedMessageId && savedActiveUntil) {
        const currentUnix = Math.floor(Date.now() / 1000);
        
        // Якщо поточний час більший за збережений час закінчення
        if (currentUnix > parseInt(savedActiveUntil)) {
            console.log("Знайдено прострочений слот. Видаляю з Discord...");
            cleanOldSlotSilent();
        }
    }
});

async function handleAction(type, minutes = 0) {
    const username = document.getElementById("username").value.trim();
    if (!username) {
        alert("Будь ласка, введи свій нікнейм!");
        return;
    }
    localStorage.setItem("radar_username", username);

    const webhookUrl = getWebhookUrl();
    const savedMessageId = localStorage.getItem("radar_msg_id");

    // ЛОГІКА 1: ПОВНЕ ВИДАЛЕННЯ СЛОТУ (ОФЛАЙН)
    if (type === 'offline') {
        if (savedMessageId) {
            await deleteMessage(webhookUrl, savedMessageId);
            clearLocalTimers();
            alert("Слот успішно відмінено та видалено з Discord!");
        } else {
            alert("У тебе немає активного слоту для видалення.");
        }
        return;
    }

    // ЛОГІКА 2: ОЧИЩЕННЯ ТАЙМЕРІВ (СКИДАННЯ ЧАСУ БЕЗ ВИДАЛЕННЯ СЛОТУ)
    if (type === 'clear_time') {
        if (savedMessageId) {
            localStorage.removeItem("radar_active_until");
            localStorage.removeItem("radar_pause_minutes");
            // Продовжуємо виконання коду далі, щоб оновити повідомлення в Discord на пусте
        } else {
            alert("У тебе немає активного слоту, щоб скидати час.");
            return;
        }
    }

    const selectedActivity = document.getElementById("activity").value;
    const selectedRoleKey = document.getElementById("target-role").value;
    const rolePing = DISCORD_ROLES[selectedRoleKey] || "";

    const currentUnix = Math.floor(Date.now() / 1000);
    
    // Перевіряємо або створюємо час старту сесії
    let startStatusTime = localStorage.getItem("radar_start_time");
    if (!startStatusTime || !savedMessageId) {
        const now = new Date();
        startStatusTime = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem("radar_start_time", startStatusTime);
    }

    // Зчитуємо поточні збережені дані
    let savedActiveUntil = localStorage.getItem("radar_active_until");
    let savedPauseMinutes = localStorage.getItem("radar_pause_minutes");
    
    let activeUntilUnix = savedActiveUntil ? parseInt(savedActiveUntil) : currentUnix;
    let totalPauseMinutes = savedPauseMinutes ? parseInt(savedPauseMinutes) : 0;

    // Обробка накопичення часу
    if (type === 'active') {
        if (activeUntilUnix <= currentUnix) {
            activeUntilUnix = currentUnix;
        }
        activeUntilUnix += (minutes * 60);
        localStorage.setItem("radar_active_until", activeUntilUnix);
    } else if (type === 'pause') {
        totalPauseMinutes += minutes;
        localStorage.setItem("radar_pause_minutes", totalPauseMinutes);
    }

    // КОНСТРУКТОР ПОВІДОМЛЕННЯ (ЗШИВАННЯ 4 ЧАСТИН)
    
    // Частина 1: Базовий статус
    let part1 = `🟢 **${username}** вільний з ${startStatusTime} `;
    
    // Частина 2: Час активності (якщо він більший за поточний момент)
    let part2 = "";
    if (activeUntilUnix > currentUnix) {
        part2 = `| актуально до <t:${activeUntilUnix}:t> (<t:${activeUntilUnix}:R>) `;
    }

    // Частина 3: Запланована перерва
    let part3 = "";
    if (totalPauseMinutes > 0) {
        part3 = `| ⏳ Запланована пауза: **${totalPauseMinutes} хв** `;
    }

    // Частина 4: Контекст дозвілля та пінги ролей
    let part4 = `| Напрям: **${selectedActivity}** | ${rolePing}`;

    const finalContent = `${part1}${part2}${part3}${part4}`;
    const payload = { content: finalContent };

    // Запит до Discord (PATCH або POST)
    if (savedMessageId) {
        fetch(`${webhookUrl}/messages/${savedMessageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (res.ok) {
                if (type === 'clear_time') alert("Таймери успішно скинуто!");
                else alert("Слот оновлено!");
            } else {
                createNewSlot(webhookUrl, payload);
            }
        });
    } else {
        createNewSlot(webhookUrl, payload);
    }
}

function createNewSlot(webhookUrl, payload) {
    fetch(`${webhookUrl}?wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.id) {
            localStorage.setItem("radar_msg_id", data.id);
            alert("Статус успішно опубліковано!");
        }
    });
}

function clearLocalTimers() {
    localStorage.removeItem("radar_msg_id");
    localStorage.removeItem("radar_active_until");
    localStorage.removeItem("radar_pause_minutes");
    localStorage.removeItem("radar_start_time");
}

function cleanOldSlotSilent() {
    const savedMessageId = localStorage.getItem("radar_msg_id");
    if (savedMessageId) {
        const webhookUrl = getWebhookUrl();
        deleteMessage(webhookUrl, savedMessageId).then(() => {
            clearLocalTimers();
        }).catch(() => {
            clearLocalTimers();
        });
    }
}

function deleteMessage(webhookUrl, msgId) {
    return fetch(`${webhookUrl}/messages/${msgId}`, { method: "DELETE" });
}