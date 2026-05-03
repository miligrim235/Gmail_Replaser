(async function () {
    'use strict';
    if (window.self !== window.top) {
        return;
    }

    const folderPromise = chrome.storage.sync.get(["folder"]).then((x) => x.folder);

    // Селекторы
    const INBOX_TABLE_SELECTOR = 'table.F.cf.zt';
    const TARGET_ID_PREFIX = 'external-mail-';
    const BACK_BTN_SELECTOR = '[act="19"]';
    const TITLE_SELECTOR = ".ha>.hP";
    const FROM_SELECTOR = "span[email].gD";
    const HOVER_EMAIL_SELECTOR = ".naw2tb";

    let json;

    const time = GetTime();
    init();
    async function init() {
        console.log("Скрипт запущен, ищем интерфейс Gmail...");
        const style = document.createElement('style');
        style.innerHTML = `
      /* Делаем tbody флекс-контейнером, чтобы управлять порядком строк */
      table.F.cf.zt tbody {
        display: flex !important;
        flex-direction: column !important;
      }
      /* Каждая строка должна растягиваться на всю ширину */
      table.F.cf.zt tbody tr {
        display: flex !important;
        width: 100% !important;
      }
      /* Кастомные письма получают отрицательный order, чтобы быть сверху */
      tr[id^="external-mail-"] {
        order: -1 !important;
      }
      /* Настройка ширины колонок для flex-режима (чтобы верстка не поехала) */
      .yX { width: 200px !important; flex-shrink: 0; } /* Отправитель */
      .a4W { flex-grow: 1 !important; } /* Тема */
      .xW { width: 80px !important; text-align: right; } /* Дата */
      .oZ-x3 { width: 40px !important; } /* Чекбокс */
        `;
        document.head.appendChild(style);
        var externalEmails = await syncEmailsWithStorage(await folderPromise);
        externalEmails.reverse();
        console.log(externalEmails);

        const observer = new MutationObserver((mutations, obs) => {
            const inboxTable = document.querySelector(INBOX_TABLE_SELECTOR);

            if (inboxTable) {
                externalEmails.forEach(data => {
                    if (!document.getElementById(TARGET_ID_PREFIX + data.id)) {
                        injectCustomEmail(inboxTable, data);
                        console.log("=================");
                        console.log(document.getElementById(TARGET_ID_PREFIX + data.id));
                        console.log(data);
                        console.log("=================");
                    }
                });
            }
            if (window.location.hash.includes("#all")) {
                const backBtn = document.querySelector(BACK_BTN_SELECTOR);
                if (backBtn && !backBtn.dataset.extAttached) {
                    backBtn.dataset.extAttached = "true";
                    const handleBackNavigation = (e) => {
                        console.log("Custom Back Action triggered");
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        window.location.hash = '#inbox';
                    };
                    backBtn.addEventListener('click', handleBackNavigation, true);
                    backBtn.addEventListener('mousedown', handleBackNavigation, true);
                } 
                const title = document.querySelector(TITLE_SELECTOR);       
                try {
                    let jsonTry = JSON.parse(title.textContent);
                    if (jsonTry.length > 1) {
                        json = jsonTry;
                        title.textContent = json[2]; 
                        const emailFrom = json[1];
                        const nameFrom = json[0];
                        const from = document.querySelector(FROM_SELECTOR);
                        from.onmouseover = () => {
                            let hoverEmail = document.querySelector(HOVER_EMAIL_SELECTOR);
                            hoverEmail.textContent = json[0];
                        }
                        from.email = emailFrom;
                        from.dataset.hovercardId = emailFrom;
                        from.name = nameFrom;
                        from.firstChild.textContent = nameFrom;                          
                    }
                } catch {}
            }
        });

        // Начинаем следить за всем документом
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }


    function injectCustomEmail(table, data) {
        if (!document.getElementById(TARGET_ID_PREFIX + data.id)) {
            var row = createGmailRow(data);
            // Вставляем в КОНЕЦ. Gmail видит письма в конце
            // Но благодаря CSS order: -1 они окажутся в самом верху списка.
            table.tBodies[0].appendChild(row);
        }
    }

    function createGmailRow(data) {
        const row = document.createElement('tr');
        row.id = TARGET_ID_PREFIX + data.id;
        // zA = строка, yO = прочитано (zE = непрочитано)
        row.className = `zA ${data.unread ? 'zE' : 'yO'}`;
        row.setAttribute('role', 'row');
        row.tabIndex = -1;


        row.innerHTML = `
            <td class="PF xY"></td>
            <td class="oZ-x3 xY" data-tooltip="Выбрать">
                <div class="oZ-jc T-Jo J-J5-Ji" role="checkbox" aria-checked="false" tabindex="-1">
                    <div class="T-Jo-auh"></div>
                </div>
            </td>
            <td class="apU xY">
                <span class="aXw T-KT" role="button" data-tooltip="Не помечено">
                    <img class="T-KT-JX" src="images/cleardot.gif" alt="">
                </span>
            </td>
            <td class="yX xY ulKHrd" role="gridcell">
                <div class="yW">
                    <span class="bA4">
                        <span class="${data.unread ? 'zF' : 'yP'}" email="${data.email}">${data.from}</span>
                    </span>
                </div>
            </td>
            <td class="xY a4W" role="gridcell">
                <div class="xS" role="link">
                    <div class="xT">
                        <div class="y6">
                            <span class="bog">
                                <span class="${data.unread ? 'bqe' : ''}">${data.subject}</span>
                            </span>
                        </div>
                        <span class="y2"><span class="Zt">&nbsp;-&nbsp;</span>${data.snippet}</span>
                    </div>
                </div>
            </td>
            <td class="byZ xY" role="gridcell"></td>
            <td class="yf xY ">&nbsp;</td>
            <td class="xW xY" role="gridcell">
                <span title="${data.fullDate}">
                    <span class="${data.unread ? 'bq3' : ''}">${time}</span>
                </span>
            </td>
            <td class="bq4 xY"></td> <!-- Место для кнопок при наведении -->
            <td class="xY"></td>
        `;

        // Делаем письмо кликабельным (открывает поиск или конкретную метку)
        row.onclick = () => {
            window.location.hash = `#all/${BigInt(data.id).toString(16)}`;
        };
        row.onmouseover = () => {
            if (!row.classList.contains("aqw")) {
                row.classList.add("aqw");
                var elem = document.createElement("td");
                elem.classList = "bq4 xY";
                elem.innerHTML = `
          <ul class="bqY" id=":2p" role="toolbar">
            <li class="bqX brq" data-tooltip="Архивировать" jsaction="JqEhuc" jscontroller="pk1i4d"
                jslog="20281; u014N:xr6bB,cOuCgd,Kr2w4b; 1:WyIjdGhyZWFkLWY6MTg2MTI3NzczODI4MzE5MDAzMSJd"></li>
            <li class="bqX bru" id="del-btn-${data.id}" data-tooltip="Удалить" jsaction="zM6fo" jscontroller="pmCKac"
                jslog="20283; u014N:xr6bB,cOuCgd,Kr2w4b; 1:WyIjdGhyZWFkLWY6MTg2MTI3NzczODI4MzE5MDAzMSJd"></li>
            <li class="bqX SHFPQe" data-tooltip="Отметить как непрочитанное" jsaction="XdlY1e" jscontroller="VtSflc"
                jslog="20284; u014N:xr6bB,cOuCgd,Kr2w4b; 1:WyIjdGhyZWFkLWY6MTg2MTI3NzczODI4MzE5MDAzMSJd"></li>
            <li class="bqX brv" data-tooltip="Отложить" jsaction="u4Fnue" jscontroller="PKSrle"
                jslog="20285; u014N:xr6bB,cOuCgd,Kr2w4b; 1:WyIjdGhyZWFkLWY6MTg2MTI3NzczODI4MzE5MDAzMSJd"></li>
        </ul>
        `;
                const delBtn = elem.querySelector(`#del-btn-${data.id}`);
                if (delBtn) {
                    delBtn.onclick = async (e) => {
                        e.stopPropagation(); // Чтобы не сработал переход по ссылке письма

                        // 1. Визуально удаляем строку из таблицы
                        row.style.transition = 'opacity 0.2s ease';
                        row.style.opacity = '0';
                        setTimeout(() => row.remove(), 200);

                        // 2. Удаляем из памяти расширения
                        await deleteEmailFromStorage(data.id);
                    };
                }
                row.appendChild(elem);
            } else {

            }
        };
        row.onmouseout = () => {
            if (!row.matches(":hover")) {
                row.classList.remove("aqw");
                row.querySelectorAll(".bq4.xY").forEach(el => { el.remove(); });
            }
        };

        return row;
    }

    async function syncEmailsWithStorage(folder = 'test') {
        const rssUrl = `https://mail.google.com/mail/u/0/feed/atom/${folder}`;

        try {
            console.log("START_FETCH==================");
            const response = await fetch(rssUrl);
            console.log("END_FETCH==================");
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            // Извлекаем все записи (entry) из RSS
            const entries = xmlDoc.querySelectorAll("entry");
            const currentRssEmails = Array.from(entries).map(entry => {
                // ID в RSS обычно выглядит как tag:google.com,2004:thread:12345678
                const fullId = entry.querySelector("id").textContent;
                const threadId = fullId.split(':').pop(); // Достаем только числовой ID

                const jsonSubject = entry.querySelector("title")?.textContent;
                const parsed = JSON.parse(jsonSubject);

                return {
                    id: threadId,
                    from: parsed[0] || "Неизвестен",
                    subject: parsed[2] || "Без темы",
                    date: entry.querySelector("issued")?.textContent || "",
                    snippet: parsed[3],
                    unread: true // В RSS попадают только непрочитанные
                };
            });

            const currentIds = currentRssEmails.map(e => e.id);

            // Получаем старые данные из памяти расширения
            const storageData = await chrome.storage.local.get(['saved_emails']);
            let savedEmails = storageData.saved_emails || [];

            // ОБРАБОТКА ИЗМЕНЕНИЙ
            // 1. Те, что исчезли из RSS -> помечаем как прочитанные
            savedEmails = savedEmails.map(email => {
                if (email.unread && !currentIds.includes(email.id)) {
                    return { ...email, unread: false };
                }
                return email;
            });

            // 2. Добавляем те, которых еще нет в памяти
            const savedIds = savedEmails.map(e => e.id);
            currentRssEmails.forEach(email => {
                if (!savedIds.includes(email.id)) {
                    savedEmails.push(email);
                }
            });

            // Сохраняем обновленный список (ограничение: 50 писем)
            const updatedList = savedEmails.slice(-50);
            await chrome.storage.local.set({ 'saved_emails': updatedList });

            console.log(`Синхронизация завершена. Писем в базе: ${updatedList.length}`);
            console.log("END_SYNC==================");
            return updatedList;

        } catch (error) {
            console.error("Ошибка RSS синхронизации:", error);
            return [];
        }
    }

    function GetTime() {
        const now = new Date();
        const hours = String(now.getHours());
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        return currentTime;
    }

    async function deleteEmailFromStorage(id) {
        try {
            const data = await chrome.storage.local.get(['saved_emails']);
            let savedEmails = data.saved_emails || [];

            // Фильтруем массив, исключая письмо с указанным ID
            const filteredEmails = savedEmails.filter(email => email.id !== id);

            await chrome.storage.local.set({ 'saved_emails': filteredEmails });
            console.log(`Письмо ${id} удалено из памяти.`);
        } catch (e) {
            console.error("Ошибка при удалении из памяти:", e);
        }
    }

})();
