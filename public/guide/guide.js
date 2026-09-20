// The BugIt Guide on bugit.dev: prepared answers, in the visitor's own browser.
//
// NO MODEL, NO SERVER, NO CREDITS. The owner's decision of 2026-09-17 is that the Portal Guide may
// spend up to one dollar per customer per month on a model, and that the website Guide spends
// nothing. This site is static, on Cloudflare Pages, with no backend to call even if it wanted one:
// the widget downloads one language file of answers written in advance, matches the question against
// it here (./match.js), and shows the prepared text word for word. A question never leaves the page.
//
// It is the prototype's interface (prototype-chatbot/widget/guide.js), with everything that needed a
// server taken out: the model calls and their streaming, the answer signatures that stopped a
// visitor forging "the assistant said X" back into a ticket, the Cloudflare robot check that guarded
// paid calls, and the ticket form that posted to an endpoint. Where the prototype offered a form,
// this offers a button that opens the visitor's own email application, addressed to support, with
// the question already written.
//
// Loaded as a module from index.html. It renders nothing until a visitor presses the launcher.

import { PREPARED_LANGS, answerFor, buildPreparedBank, guessLanguage, languageFromBank, undash } from "./match.js";

(function () {
  "use strict";
  if (window.__bugitGuideLoaded) return;
  window.__bugitGuideLoaded = true;

  const BANK_BASE = "/public/guide/prepared/";
  const SOURCES_URL = "/public/guide/sources.json";
  const SUPPORT_EMAIL = "support@bugit.dev";
  const STORE_KEY = "bugitGuide.v1";
  const MAX_INPUT = 2000;
  // The strip under the greeting: ask in any of these, and the answer comes back in that language.
  const LANGS = [["en", "English"], ["ar", "العربية"], ["de", "Deutsch"], ["es", "Español"], ["fr", "Français"], ["it", "Italiano"], ["ja", "日本語"], ["ko", "한국어"], ["pt-br", "Português"], ["ru", "Русский"], ["zh", "中文"]];

  const I18N = {
    en: {
      launch: "Ask BugIt", title: "BugIt Guide", status: "Answers from BugIt's docs", statusBusy: "Looking into it",
      newChat: "New conversation", expand: "Expand", collapse: "Shrink", close: "Close",
      eyebrow: "Ask in your language", h1: "What can I help you ", h2: "figure out?",
      helloSub: "I answer from BugIt's documentation, using answers written in advance. If I can't confirm something, I'll help you email the team.",
      cards: [
        { tag: "Get started", q: "How do I install BugIt?" },
        { tag: "Trackers", q: "Does BugIt work with Jira and Azure DevOps?" },
        { tag: "Licenses", q: "What's the difference between Solo and Team?" },
        { tag: "Privacy", q: "Does BugIt send my code anywhere?" },
      ],
      placeholder: "Ask about setup, trackers, licenses…", inputLabel: "Your question", send: "Send", disclaimer: "Answers can be wrong. Never paste passwords or tokens.", human: "Talk to a person",
      searching: "Searching BugIt's docs", searched: "Checked BugIt's docs", found: "Relevant articles: {n}", noMatch: "No matching article",
      sources: "Sources", related: "You might also ask",
      copy: "Copy answer", copied: "Copied", good: "Helpful", bad: "Not helpful", thanks: "Thanks for the feedback",
      ticketTitle: "Send this to the BugIt team", errNetwork: "The connection dropped. Check your network and try again.",
      errSecret: "That looks like a password, token or card number. Remove it, then send again.",
      retry: "Try again", langsLabel: "Ask in any of these languages",
      docs: { userGuide: "User guide", overview: "Product overview", license: "License terms", privacy: "Privacy policy", refund: "Refund policy", commerce: "Commercial disclosure", faq: "FAQ", support: "Support" },
    },
    ar: {
      launch: "اسأل BugIt", title: "BugIt Guide", status: "إجابات من وثائق BugIt", statusBusy: "جارٍ العمل على ذلك",
      newChat: "محادثة جديدة", expand: "توسيع", collapse: "تصغير", close: "إغلاق",
      eyebrow: "اسأل بلغتك", h1: "كيف يمكنني ", h2: "مساعدتك؟",
      helloSub: "أجيب من وثائق BugIt بإجابات مُعدّة مسبقًا. وإذا لم أستطع تأكيد شيء، أساعدك في مراسلة الفريق بالبريد الإلكتروني.",
      cards: [
        { tag: "البدء", q: "كيف أثبّت BugIt؟" },
        { tag: "أدوات التتبع", q: "هل يعمل BugIt مع Jira وAzure DevOps؟" },
        { tag: "التراخيص", q: "ما الفرق بين Solo وTeam؟" },
        { tag: "الخصوصية", q: "هل يرسل BugIt الشيفرة الخاصة بي إلى أي مكان؟" },
      ],
      placeholder: "اسأل عن الإعداد وأدوات التتبع والتراخيص…", inputLabel: "سؤالك", send: "إرسال", disclaimer: "قد تحتوي الإجابات على أخطاء. لا تلصق كلمات المرور أو الرموز المميزة أبدًا.", human: "التحدث إلى شخص",
      searching: "جارٍ البحث في وثائق BugIt", searched: "تم الاطلاع على وثائق BugIt", found: "المقالات ذات الصلة: {n}", noMatch: "لا توجد مقالة مطابقة",
      sources: "المصادر", related: "قد ترغب أيضًا في السؤال",
      copy: "نسخ الإجابة", copied: "تم النسخ", good: "مفيد", bad: "غير مفيد", thanks: "شكرًا على ملاحظاتك",
      ticketTitle: "أرسل هذا إلى فريق BugIt", errNetwork: "انقطع الاتصال. تحقق من الشبكة وحاول مرة أخرى.",
      errSecret: "يبدو هذا ككلمة مرور أو رمز مميز أو رقم بطاقة. احذفه ثم أرسل مرة أخرى.",
      retry: "إعادة المحاولة", langsLabel: "اسأل بأي لغة من هذه اللغات",
    },
    de: {
      launch: "BugIt fragen", title: "BugIt Guide", status: "Antworten aus der BugIt-Dokumentation", statusBusy: "Wird bearbeitet",
      newChat: "Neues Gespräch", expand: "Vergrößern", collapse: "Verkleinern", close: "Schließen",
      eyebrow: "Fragen Sie in Ihrer Sprache", h1: "Wobei kann ich ", h2: "Ihnen helfen?",
      helloSub: "Ich antworte anhand der BugIt-Dokumentation mit vorab geschriebenen Antworten. Wenn ich etwas nicht bestätigen kann, helfe ich Ihnen, dem Team eine E-Mail zu schreiben.",
      cards: [
        { tag: "Erste Schritte", q: "Wie installiere ich BugIt?" },
        { tag: "Tracker", q: "Funktioniert BugIt mit Jira und Azure DevOps?" },
        { tag: "Lizenzen", q: "Was ist der Unterschied zwischen Solo und Team?" },
        { tag: "Datenschutz", q: "Sendet BugIt meinen Code irgendwohin?" },
      ],
      placeholder: "Fragen zu Einrichtung, Trackern, Lizenzen…", inputLabel: "Ihre Frage", send: "Senden", disclaimer: "Antworten können fehlerhaft sein. Fügen Sie niemals Passwörter oder Tokens ein.", human: "Mit einem Supportmitarbeiter sprechen",
      searching: "BugIt-Dokumentation wird durchsucht", searched: "BugIt-Dokumentation geprüft", found: "Passende Artikel: {n}", noMatch: "Kein passender Artikel",
      sources: "Quellen", related: "Das könnte Sie auch interessieren",
      copy: "Antwort kopieren", copied: "Kopiert", good: "Hilfreich", bad: "Nicht hilfreich", thanks: "Danke für Ihr Feedback",
      ticketTitle: "An das BugIt-Team senden", errNetwork: "Die Verbindung wurde unterbrochen. Prüfen Sie Ihr Netzwerk und versuchen Sie es erneut.",
      errSecret: "Das sieht nach einem Passwort, Token oder einer Kartennummer aus. Entfernen Sie es und senden Sie erneut.",
      retry: "Erneut versuchen", langsLabel: "Fragen Sie in einer dieser Sprachen",
    },
    es: {
      launch: "Pregunta a BugIt", title: "BugIt Guide", status: "Respuestas de la documentación de BugIt", statusBusy: "Trabajando en ello",
      newChat: "Nueva conversación", expand: "Ampliar", collapse: "Reducir", close: "Cerrar",
      eyebrow: "Pregunta en tu idioma", h1: "¿En qué puedo ", h2: "ayudarte?",
      helloSub: "Respondo con la documentación de BugIt, usando respuestas escritas de antemano. Si no puedo confirmar algo, te ayudo a escribir al equipo por correo electrónico.",
      cards: [
        { tag: "Primeros pasos", q: "¿Cómo instalo BugIt?" },
        { tag: "Trackers", q: "¿BugIt funciona con Jira y Azure DevOps?" },
        { tag: "Licencias", q: "¿Qué diferencia hay entre Solo y Team?" },
        { tag: "Privacidad", q: "¿BugIt envía mi código a alguna parte?" },
      ],
      placeholder: "Pregunta sobre instalación, trackers, licencias…", inputLabel: "Tu pregunta", send: "Enviar", disclaimer: "Las respuestas pueden contener errores. Nunca pegues contraseñas ni tokens.", human: "Hablar con una persona",
      searching: "Buscando en la documentación de BugIt", searched: "Documentación de BugIt revisada", found: "Artículos relevantes: {n}", noMatch: "Ningún artículo coincide",
      sources: "Fuentes", related: "También podrías preguntar",
      copy: "Copiar respuesta", copied: "Copiado", good: "Útil", bad: "No es útil", thanks: "Gracias por tu opinión",
      ticketTitle: "Enviar esto al equipo de BugIt", errNetwork: "Se ha perdido la conexión. Comprueba tu red e inténtalo de nuevo.",
      errSecret: "Parece una contraseña, un token o un número de tarjeta. Elimínalo y vuelve a enviar.",
      retry: "Reintentar", langsLabel: "Pregunta en cualquiera de estos idiomas",
    },
    fr: {
      launch: "Demander à BugIt", title: "BugIt Guide", status: "Réponses tirées de la documentation BugIt", statusBusy: "Recherche en cours",
      newChat: "Nouvelle conversation", expand: "Agrandir", collapse: "Réduire", close: "Fermer",
      eyebrow: "Posez vos questions dans votre langue", h1: "Comment puis-je ", h2: "vous aider ?",
      helloSub: "Je réponds à partir de la documentation de BugIt, avec des réponses rédigées à l'avance. Si je ne peux pas confirmer quelque chose, je vous aide à écrire un e-mail à l'équipe.",
      cards: [
        { tag: "Premiers pas", q: "Comment installer BugIt ?" },
        { tag: "Outils de suivi", q: "BugIt fonctionne-t-il avec Jira et Azure DevOps ?" },
        { tag: "Licences", q: "Quelle différence entre Solo et Team ?" },
        { tag: "Confidentialité", q: "BugIt envoie-t-il mon code quelque part ?" },
      ],
      placeholder: "Installation, outils de suivi, licences…", inputLabel: "Votre question", send: "Envoyer", disclaimer: "Les réponses peuvent contenir des erreurs. Ne collez jamais de mots de passe ni de jetons.", human: "Parler à une personne",
      searching: "Recherche dans la documentation BugIt", searched: "Documentation BugIt consultée", found: "Articles pertinents : {n}", noMatch: "Aucun article correspondant",
      sources: "Sources", related: "Vous pourriez aussi demander",
      copy: "Copier la réponse", copied: "Copié", good: "Utile", bad: "Pas utile", thanks: "Merci pour votre retour",
      ticketTitle: "Envoyer à l’équipe BugIt", errNetwork: "La connexion a été interrompue. Vérifiez votre réseau et réessayez.",
      errSecret: "Cela ressemble à un mot de passe, un jeton ou un numéro de carte. Supprimez-le, puis renvoyez le message.",
      retry: "Réessayer", langsLabel: "Posez vos questions dans l’une de ces langues",
    },
    it: {
      launch: "Chiedi a BugIt", title: "BugIt Guide", status: "Risposte dalla documentazione di BugIt", statusBusy: "Ci sto lavorando",
      newChat: "Nuova conversazione", expand: "Espandi", collapse: "Riduci", close: "Chiudi",
      eyebrow: "Chiedi nella tua lingua", h1: "Come posso ", h2: "aiutarti?",
      helloSub: "Rispondo con la documentazione di BugIt, usando risposte scritte in anticipo. Se non posso confermare qualcosa, ti aiuto a scrivere un'email al team.",
      cards: [
        { tag: "Per iniziare", q: "Come installo BugIt?" },
        { tag: "Tracker", q: "BugIt funziona con Jira e Azure DevOps?" },
        { tag: "Licenze", q: "Che differenza c’è tra Solo e Team?" },
        { tag: "Privacy", q: "BugIt invia il mio codice da qualche parte?" },
      ],
      placeholder: "Chiedi di installazione, tracker, licenze…", inputLabel: "La tua domanda", send: "Invia", disclaimer: "Le risposte possono contenere errori. Non incollare mai password o token.", human: "Parla con una persona",
      searching: "Ricerca nella documentazione di BugIt", searched: "Documentazione di BugIt consultata", found: "Articoli pertinenti: {n}", noMatch: "Nessun articolo corrispondente",
      sources: "Fonti", related: "Potresti anche chiedere",
      copy: "Copia risposta", copied: "Copiato", good: "Utile", bad: "Non utile", thanks: "Grazie per il feedback",
      ticketTitle: "Invia al team di BugIt", errNetwork: "La connessione si è interrotta. Controlla la rete e riprova.",
      errSecret: "Sembra una password, un token o un numero di carta. Rimuovilo e invia di nuovo.",
      retry: "Riprova", langsLabel: "Chiedi in una di queste lingue",
    },
    ja: {
      launch: "BugIt に質問", title: "BugIt Guide", status: "BugIt のドキュメントに基づいて回答", statusBusy: "回答を準備中",
      newChat: "新しい会話", expand: "拡大", collapse: "縮小", close: "閉じる",
      eyebrow: "お使いの言語で質問できます", h1: "どんなことを", h2: "お手伝いしましょうか？",
      helloSub: "BugIt のドキュメントをもとに、あらかじめ用意された回答をお示しします。確認できない内容は、チーム宛てのメール作成をお手伝いします。",
      cards: [
        { tag: "はじめに", q: "BugIt のインストール手順を教えてください。" },
        { tag: "トラッカー", q: "BugIt は Jira や Azure DevOps で使えますか？" },
        { tag: "ライセンス", q: "Solo と Team の違いは何ですか？" },
        { tag: "プライバシー", q: "BugIt はコードを外部に送信しますか？" },
      ],
      placeholder: "セットアップ、トラッカー、ライセンスについて質問…", inputLabel: "質問", send: "送信", disclaimer: "回答が誤っている場合があります。パスワードやトークンは絶対に貼り付けないでください。", human: "担当者に問い合わせる",
      searching: "BugIt のドキュメントを検索中", searched: "BugIt のドキュメントを確認しました", found: "関連する記事：{n}件", noMatch: "該当する記事はありません",
      sources: "出典", related: "こんな質問もできます",
      copy: "回答をコピー", copied: "コピーしました", good: "役に立った", bad: "役に立たなかった", thanks: "フィードバックありがとうございます",
      ticketTitle: "BugIt チームに送信", errNetwork: "接続が切れました。ネットワークを確認して、もう一度お試しください。",
      errSecret: "パスワード、トークン、またはカード番号のようです。削除してから、もう一度送信してください。",
      retry: "再試行", langsLabel: "次の言語で質問できます",
    },
    ko: {
      launch: "BugIt에 질문", title: "BugIt Guide", status: "BugIt 문서를 바탕으로 답변", statusBusy: "답변 준비 중",
      newChat: "새 대화", expand: "확대", collapse: "축소", close: "닫기",
      eyebrow: "사용하는 언어로 질문하세요", h1: "무엇을 ", h2: "도와드릴까요?",
      helloSub: "BugIt 문서를 바탕으로 미리 작성된 답변을 보여 드립니다. 확인할 수 없는 내용은 팀에 보낼 메일 작성을 도와드립니다.",
      cards: [
        { tag: "시작하기", q: "BugIt은 어떻게 설치하나요?" },
        { tag: "트래커", q: "BugIt은 어떤 트래커를 지원하나요?" },
        { tag: "라이선스", q: "Solo와 Team은 어떻게 다른가요?" },
        { tag: "개인정보 보호", q: "BugIt이 제 코드를 외부로 보내나요?" },
      ],
      placeholder: "설정, 트래커, 라이선스에 대해 질문하세요…", inputLabel: "질문", send: "보내기", disclaimer: "답변이 틀릴 수 있습니다. 비밀번호나 토큰은 절대 붙여넣지 마세요.", human: "상담원과 연결",
      searching: "BugIt 문서 검색 중", searched: "BugIt 문서 확인 완료", found: "관련 문서: {n}건", noMatch: "일치하는 문서 없음",
      sources: "출처", related: "이런 질문도 해 보세요",
      copy: "답변 복사", copied: "복사됨", good: "도움이 됨", bad: "도움이 안 됨", thanks: "의견을 보내 주셔서 감사합니다",
      ticketTitle: "BugIt 팀에 보내기", errNetwork: "연결이 끊어졌습니다. 네트워크를 확인한 후 다시 시도하세요.",
      errSecret: "비밀번호, 토큰 또는 카드 번호로 보입니다. 삭제한 후 다시 보내세요.",
      retry: "다시 시도", langsLabel: "다음 언어로 질문할 수 있습니다",
    },
    "pt-br": {
      launch: "Pergunte ao BugIt", title: "BugIt Guide", status: "Respostas da documentação do BugIt", statusBusy: "Trabalhando nisso",
      newChat: "Nova conversa", expand: "Expandir", collapse: "Reduzir", close: "Fechar",
      eyebrow: "Pergunte no seu idioma", h1: "Como posso ", h2: "ajudar você?",
      helloSub: "Respondo com a documentação do BugIt, usando respostas escritas com antecedência. Se eu não puder confirmar algo, ajudo você a escrever um e-mail para a equipe.",
      cards: [
        { tag: "Primeiros passos", q: "Como instalo o BugIt?" },
        { tag: "Trackers", q: "O BugIt funciona com Jira e Azure DevOps?" },
        { tag: "Licenças", q: "Qual a diferença entre Solo e Team?" },
        { tag: "Privacidade", q: "O BugIt envia meu código para algum lugar?" },
      ],
      placeholder: "Pergunte sobre instalação, trackers, licenças…", inputLabel: "Sua pergunta", send: "Enviar", disclaimer: "As respostas podem conter erros. Nunca cole senhas ou tokens.", human: "Falar com uma pessoa",
      searching: "Pesquisando a documentação do BugIt", searched: "Documentação do BugIt consultada", found: "Artigos relevantes: {n}", noMatch: "Nenhum artigo correspondente",
      sources: "Fontes", related: "Você também pode perguntar",
      copy: "Copiar resposta", copied: "Copiado", good: "Útil", bad: "Não foi útil", thanks: "Obrigado pelo feedback",
      ticketTitle: "Enviar para a equipe do BugIt", errNetwork: "A conexão caiu. Verifique sua rede e tente novamente.",
      errSecret: "Isso parece uma senha, um token ou um número de cartão. Remova e envie novamente.",
      retry: "Tentar novamente", langsLabel: "Pergunte em qualquer um destes idiomas",
    },
    ru: {
      launch: "Спросить BugIt", title: "BugIt Guide", status: "Ответы из документации BugIt", statusBusy: "Идёт поиск ответа",
      newChat: "Новый чат", expand: "Развернуть", collapse: "Свернуть", close: "Закрыть",
      eyebrow: "Спрашивайте на своём языке", h1: "Чем я могу ", h2: "помочь?",
      helloSub: "Я отвечаю по документации BugIt заранее написанными ответами. Если я не могу что-то подтвердить, помогу вам написать письмо команде.",
      cards: [
        { tag: "Начало работы", q: "Как установить BugIt?" },
        { tag: "Трекеры", q: "Работает ли BugIt с Jira и Azure DevOps?" },
        { tag: "Лицензии", q: "Чем отличаются Solo и Team?" },
        { tag: "Конфиденциальность", q: "Отправляет ли BugIt мой код куда-либо?" },
      ],
      placeholder: "Спросите о настройке, трекерах, лицензиях…", inputLabel: "Ваш вопрос", send: "Отправить", disclaimer: "Ответы могут содержать ошибки. Никогда не вставляйте пароли и токены.", human: "Связаться со специалистом поддержки",
      searching: "Поиск в документации BugIt", searched: "Документация BugIt проверена", found: "Подходящих статей: {n}", noMatch: "Подходящих статей нет",
      sources: "Источники", related: "Вы также можете спросить",
      copy: "Копировать ответ", copied: "Скопировано", good: "Полезно", bad: "Не помогло", thanks: "Спасибо за отзыв",
      ticketTitle: "Отправить команде BugIt", errNetwork: "Соединение прервано. Проверьте сеть и повторите попытку.",
      errSecret: "Похоже на пароль, токен или номер карты. Удалите это и отправьте снова.",
      retry: "Повторить", langsLabel: "Спрашивайте на любом из этих языков",
    },
    zh: {
      launch: "询问 BugIt", title: "BugIt Guide", status: "基于 BugIt 文档回答", statusBusy: "正在处理",
      newChat: "新对话", expand: "展开", collapse: "收起", close: "关闭",
      eyebrow: "用您的语言提问", h1: "有什么可以", h2: "帮您？",
      helloSub: "我根据 BugIt 的文档，用预先写好的回答作答。无法确认的内容，我会帮您写一封发给团队的邮件。",
      cards: [
        { tag: "快速上手", q: "如何安装 BugIt？" },
        { tag: "跟踪工具", q: "BugIt 支持 Jira 和 Azure DevOps 吗？" },
        { tag: "许可证", q: "Solo 和 Team 有什么区别？" },
        { tag: "隐私", q: "BugIt 会把我的代码发送到别处吗？" },
      ],
      placeholder: "询问设置、跟踪工具、许可证等问题…", inputLabel: "您的问题", send: "发送", disclaimer: "回答可能有误。切勿粘贴密码或令牌。", human: "联系人工客服",
      searching: "正在搜索 BugIt 文档", searched: "已查阅 BugIt 文档", found: "相关文章：{n}篇", noMatch: "没有匹配的文章",
      sources: "来源", related: "您还可以问",
      copy: "复制回答", copied: "已复制", good: "有帮助", bad: "没有帮助", thanks: "感谢您的反馈",
      ticketTitle: "发送给 BugIt 团队", errNetwork: "连接已中断。请检查网络后重试。",
      errSecret: "这看起来像密码、令牌或银行卡号。请删除后再发送。",
      retry: "重试", langsLabel: "可以用以下任一语言提问",
    },
  };

  const SVG = (body, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
  const I = {
    send: SVG('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', ' stroke-width="2.3"'),
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor"/></svg>',
    close: SVG('<path d="M6 6l12 12M18 6 6 18"/>'),
    expand: SVG('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>'),
    shrink: SVG('<path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/>'),
    fresh: SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    copy: SVG('<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    up: SVG('<path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4.3-7.2A1.8 1.8 0 0 1 15 5.9Z"/>'),
    down: SVG('<g transform="rotate(180 12 12)"><path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4.3-7.2A1.8 1.8 0 0 1 15 5.9Z"/></g>'),
    check: SVG('<path d="m5 12.5 4.2 4.2L19 7"/>', ' stroke-width="3.2"'),
    minus: SVG('<path d="M7 12h10"/>', ' stroke-width="3.4"'),
    book: SVG('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
    next: SVG('<path d="M15 10l5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>', ' stroke-width="2.2"'),
    person: SVG('<path d="M3 11a9 9 0 0 1 18 0"/><rect x="2" y="11" width="4" height="7" rx="2"/><rect x="18" y="11" width="4" height="7" rx="2"/><path d="M20 18a4 4 0 0 1-4 4h-3"/>'),
    dot: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21a8 8 0 0 1 16 0Z" fill="currentColor"/></svg>',
    caret: SVG('<path d="m6 9 6 6 6-6"/>', ' stroke-width="2.2" width="14" height="14"'),
    rocket: SVG('<path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2Z"/>'),
    plug: SVG('<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>'),
    key: SVG('<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>'),
    shield: SVG('<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/>'),
  };
  const CARD_ICONS = [I.rocket, I.plug, I.key, I.shield];

  let blipCount = 0;
  function blip() {
    const n = ++blipCount;
    return `<svg class="bgd-blip" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><linearGradient id="bgdg${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF2E9A"/><stop offset="1" stop-color="#C21C79"/></linearGradient><clipPath id="bgdc${n}"><rect x="20" y="22" width="60" height="60" rx="20"/></clipPath></defs><g class="b-float"><rect x="30" y="82" width="12" height="8" rx="4" fill="#C21C79"/><rect x="58" y="82" width="12" height="8" rx="4" fill="#C21C79"/><rect x="20" y="22" width="60" height="60" rx="20" fill="url(#bgdg${n})"/><rect x="20" y="22" width="60" height="30" rx="20" fill="#fff" opacity=".12" clip-path="url(#bgdc${n})"/><g class="b-eye"><circle cx="50" cy="50" r="15" fill="#17101a"/><g class="b-look"><circle cx="45.8" cy="44.9" r="4.5" fill="#fff"/><circle cx="53.9" cy="54.5" r="2.1" fill="#fff" opacity=".55"/></g></g><path d="M43 68 Q50 74.3 57 68" fill="none" stroke="#17101a" stroke-width="2.4" stroke-linecap="round"/></g></svg>`;
  }


  /**
   * A line from one of the tables below. In the interface language by default, but the handoff card
   * passes the language the ANSWER is in: an answer in German inside a card in English is the exact
   * split the owner's language rule exists to prevent.
   */
  function table(t11, inLang) {
    return t11[inLang] || t11[lang] || t11.en;
  }

  // Nothing close enough in the bank. The prototype said "send it to the team below", meaning its
  // form; here the same offer is an email.
  const NO_ANSWER = {
    en: "I don't have a confirmed answer to that, so I won't guess. The button below opens an email to the BugIt team with your question in it, and a person will reply by email.",
    de: "Dazu habe ich keine bestätigte Antwort, deshalb rate ich nicht. Die Schaltfläche unten öffnet eine E-Mail an das BugIt-Team mit Ihrer Frage, und eine Person antwortet Ihnen per E-Mail.",
    es: "No tengo una respuesta confirmada para eso, así que no voy a adivinar. El botón de abajo abre un correo al equipo de BugIt con tu pregunta, y una persona te responderá por correo electrónico.",
    fr: "Je n'ai pas de réponse confirmée à ce sujet, je préfère donc ne pas deviner. Le bouton ci-dessous ouvre un e-mail à l'équipe BugIt avec votre question, et une personne vous répondra par e-mail.",
    it: "Non ho una risposta confermata su questo, quindi non tiro a indovinare. Il pulsante qui sotto apre un'email al team di BugIt con la tua domanda e una persona ti risponderà via email.",
    "pt-br": "Não tenho uma resposta confirmada para isso, então não vou arriscar. O botão abaixo abre um e-mail para a equipe do BugIt com a sua pergunta, e uma pessoa vai responder por e-mail.",
    ru: "У меня нет подтверждённого ответа на этот вопрос, поэтому я не буду гадать. Кнопка ниже открывает письмо команде BugIt с вашим вопросом, и человек ответит вам по электронной почте.",
    ar: "ليست لدي إجابة مؤكدة عن ذلك، لذا لن أخمّن. يفتح الزر أدناه رسالة بريد إلكتروني إلى فريق BugIt تتضمن سؤالك، وسيرد عليك شخص عبر البريد الإلكتروني.",
    ja: "この件については確かな回答がないため、推測ではお答えしません。下のボタンを押すと、ご質問を記載した BugIt チーム宛てのメールが開きます。担当者がメールでご返信いたします。",
    ko: "이 질문에 대해서는 확인된 답변이 없어 추측으로 답하지 않겠습니다. 아래 버튼을 누르면 질문이 담긴 BugIt 팀 앞 메일이 열리고, 담당자가 이메일로 답장드립니다.",
    zh: "关于这个问题，我没有经过确认的答案，所以不做猜测。点击下方按钮会打开一封写好您问题的邮件，发送给 BugIt 团队，专人会通过电子邮件回复您。",
  };

  const MAIL_LABEL = {
    en: "Email support", de: "Support per E-Mail", es: "Escribir a soporte", fr: "Écrire au support",
    it: "Scrivi al supporto", "pt-br": "Escrever ao suporte", ru: "Написать в поддержку",
    ar: "راسل الدعم", ja: "サポートにメール", ko: "지원팀에 메일 보내기", zh: "给支持团队发邮件",
  };

  const MAIL_NOTE = {
    en: "This opens your email application with your question already written. A person reads every message and replies by email.",
    de: "Damit öffnet sich Ihr E-Mail-Programm, Ihre Frage steht bereits darin. Jede Nachricht wird von einer Person gelesen und per E-Mail beantwortet.",
    es: "Se abre tu aplicación de correo con tu pregunta ya escrita. Una persona lee cada mensaje y responde por correo electrónico.",
    fr: "Votre application de messagerie s'ouvre avec votre question déjà rédigée. Chaque message est lu par une personne, qui répond par e-mail.",
    it: "Si apre la tua app di posta con la domanda già scritta. Ogni messaggio viene letto da una persona, che risponde via email.",
    "pt-br": "Abre seu aplicativo de e-mail com a sua pergunta já escrita. Uma pessoa lê cada mensagem e responde por e-mail.",
    ru: "Откроется ваша почтовая программа с уже написанным вопросом. Каждое письмо читает человек и отвечает по электронной почте.",
    ar: "يفتح هذا تطبيق البريد لديك وسؤالك مكتوب فيه بالفعل. يقرأ شخص كل رسالة ويرد عبر البريد الإلكتروني.",
    ja: "メールアプリが開き、ご質問がすでに入力されています。すべてのメッセージを担当者が確認し、メールで返信します。",
    ko: "메일 앱이 열리고 질문이 이미 입력되어 있습니다. 모든 메시지는 담당자가 직접 읽고 이메일로 답장합니다.",
    zh: "这会打开您的邮件应用，其中已写好您的问题。每条消息都会由专人阅读并通过电子邮件回复。",
  };

  // Above the questions offered when the Guide is not sure which was meant. "You might also ask",
  // the label for related reading, contradicted the sentence right above it.
  const SUGGEST_LABEL = {
    en: "Did you mean", de: "Meinten Sie", es: "¿Quisiste decir?", fr: "Vouliez-vous dire",
    it: "Intendevi", "pt-br": "Você quis dizer", ru: "Вы имели в виду", ar: "هل تقصد",
    ja: "もしかして", ko: "혹시 이 질문인가요", zh: "您是想问",
  };

  const HAND_LABEL = {
    en: "Preparing an email to the team", de: "E-Mail an das Team wird vorbereitet",
    es: "Preparando un correo para el equipo", fr: "Préparation d'un e-mail pour l'équipe",
    it: "Preparazione di un'email per il team", "pt-br": "Preparando um e-mail para a equipe",
    ru: "Готовлю письмо для команды", ar: "جارٍ تحضير رسالة بريد إلكتروني للفريق",
    ja: "チーム宛てのメールを準備しています", ko: "팀에 보낼 메일을 준비하고 있습니다",
    zh: "正在准备发给团队的邮件",
  };

  // The bank's own "did you mean" line, from prepared/common.json, built in rather than fetched:
  // it is one short line per language and a failed fetch would leave the suggestions unexplained.
  const DID_YOU_MEAN = {
      "en": "I'm not sure which of these you mean. Tap the one closest to your question, or ask it another way.",
      "ar": "لست متأكدًا أيًّا من هذه الخيارات تقصد. اختر الخيار الأقرب إلى سؤالك أو أعد صياغة السؤال بطريقة أخرى.",
      "de": "Ich bin nicht sicher, was genau Sie meinen. Tippen Sie auf die Option, die Ihrer Frage am nächsten kommt, oder formulieren Sie sie anders.",
      "es": "No estoy seguro de cuál de estas opciones quieres decir. Toca la que más se acerque a tu pregunta, o formúlala de otra manera.",
      "fr": "Je ne suis pas certain de comprendre laquelle de ces options correspond à votre demande. Sélectionnez celle qui s'en rapproche le plus, ou reformulez votre question.",
      "it": "Non sono sicuro a quale di queste ti riferisci. Tocca quella più vicina alla tua domanda, oppure formulala in un altro modo.",
      "ja": "どの選択肢を指しているのか判断できません。最も近いものをタップいただくか、別の言い方でお尋ねください。",
      "ko": "어떤 항목을 말씀하시는지 확실하지 않습니다. 질문과 가장 가까운 항목을 선택하시거나, 다른 방식으로 다시 질문해 주세요.",
      "pt-br": "Não tenho certeza de qual dessas opções você quer dizer. Toque na que mais se aproxima da sua pergunta, ou pergunte de outra forma.",
      "ru": "Не получилось точно понять, что вы имеете в виду. Выберите вариант, который ближе всего к вашему вопросу, или сформулируйте его по-другому.",
      "zh": "不确定您想问的是哪一项，请点击最接近您问题的选项，或换一种方式提问。"
  };

  // ---------------------------------------------------------------- helpers

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // Object.hasOwn, not truthiness: "constructor" and "__proto__" are properties of every object
  // literal, and either one would send the Guide looking for a language file that cannot exist.
  const known = (l) => Object.hasOwn(I18N, l);

  function siteLang() {
    let l = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (known(l)) return l;
    if (l.startsWith("pt")) return "pt-br";
    if (l.startsWith("zh")) return "zh";
    l = l.split("-")[0];
    return known(l) ? l : "en";
  }
  let lang = siteLang();

  function t(key, vars, inLang) {
    const table = I18N[inLang && known(inLang) ? inLang : lang] || I18N.en;
    let s = table[key] != null ? table[key] : I18N.en[key];
    if (typeof s === "string" && vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
    return s;
  }

  // The site already names its document pages in every language; use its words when they exist.
  const DOC_KEYS = { "#/docs/getting-started": "userGuide", "#/docs/user-guide": "userGuide", "#/docs/overview": "overview", "#/docs/license": "license", "#/docs/privacy": "privacy", "#/docs/refund": "refund", "#/docs/commerce": "commerce", "#/docs/faq": "faq", "#/support": "support" };
  function docLabel(href) {
    const key = DOC_KEYS[href];
    if (!key) return href;
    if (key === "faq") return "FAQ";
    try {
      if (key === "userGuide" || key === "overview") {
        // eslint-disable-next-line no-undef
        const d = typeof docDownloadLabels !== "undefined" && (docDownloadLabels[lang] || docDownloadLabels.en);
        if (d && d[key]) return d[key];
      } else {
        // eslint-disable-next-line no-undef
        const d = typeof i18n !== "undefined" && ((i18n[lang] && i18n[lang].docs) || i18n.en.docs);
        if (d && d[key]) return d[key];
      }
    } catch (_) {
      /* the site's tables are not there; fall back to ours */
    }
    return I18N.en.docs[key];
  }

  // A net for pasted secrets: the same shapes the server removes (prototype-chatbot/lib/redact.mjs),
  // so the widget warns before sending exactly what the server would strip.
  function luhn(digits) {
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = digits.charCodeAt(i) - 48;
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  const SECRET_SHAPES = [
    /\bsk-ant-[\w-]{10,}/g, /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/g, /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
    /\bgithub_pat_\w{20,}/g, /\bglpat-[\w-]{16,}/g, /\bxox[abprs]-[\w-]{10,}/g, /\bATATT[\w=-]{20,}/g,
    /\blin_api_[A-Za-z0-9]{20,}/g, /\bpk_\d+_[A-Z0-9]{20,}/g, /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/g, /\bwhsec_[A-Za-z0-9+/=]{10,}/g, /\bAIza[0-9A-Za-z_-]{30,}/g,
    /\beyJ[\w-]{6,}\.eyJ[\w-]{6,}\.[\w-]{6,}/g, /\b[a-z2-7]{52}\b/g, /\b[A-Za-z0-9]{76}AZDO[A-Za-z0-9]{4}\b/g,
    /\bBUGIT(?:-[0-9A-Z]{5}){4}\b/gi, /\b[A-Z2-7.=]{6}(?:-[A-Z2-7.=]{1,6}){7,}/g,
  ];
  // Quotes are allowed around the joiner, so pasted configuration ({"password": "hunter2"}) is caught too.
  const SECRET_ASSIGNED = new RegExp(
    String.raw`((?<![\p{L}\p{N}_])(?:pass(?:word|wd|code|phrase)|pwd|secret|client[_ -]?secret|api[_ -]?key|access[_ -]?key|private[_ -]?key|token|pat|passwort|kennwort|mot de passe|contrase[ñn]a|senha|parola d'ordine|пароль)(?![\p{L}\p{N}_])` +
      String.raw`|(?:パスワード|暗証番号|密码|密碼|口令|비밀번호|암호|كلمة (?:المرور|السر)))` +
      String.raw`(["']?(?:\s*[:=：]\s*|\s+(?:is|was|ist|lautet|est|es|é|è|era|это)\s+|\s*(?:は|が|是|为|為|는|은|هي|هو)\s*)["']?)` +
      String.raw`([^\s,;"'{}\[\]。、，]{4,})`,
    "giu",
  );
  const secretValue = (v) => !v.startsWith("[removed") && (/\d/.test(v) || /[^\p{L}]/u.test(v) || [...v].length >= 12);
  const asciiDigits = (s) => String(s)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 48))
    .replace(/[٠-٩]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48))
    .replace(/[۰-۹]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x06f0 + 48));
  // Scanned the way it reads, returned the way it was written: an invisible character inside a token
  // is looked through, and nothing outside a removed secret changes.
  const INVISIBLE_IN_WORD = /(?<=[\p{L}\p{N}_-])\p{Cf}+(?=[\p{L}\p{N}_-])/gu;
  function cardLike(m) {
    const groups = m.split(/[./_\-\p{Zs}]+/u).filter(Boolean);
    const digits = asciiDigits(groups.join(""));
    if (!/^\d{13,19}$/.test(digits) || !luhn(digits)) return false;
    if (groups.length === 1) return true;
    return /^4(?:-4){3}(?:-[1-3])?$|^4-6-[45]$/.test(groups.map((g) => g.length).join("-"));
  }
  // A whole digit run ("2026/09/14 4111 1111 1111 1111 12/28") is split into groups and every span of
  // up to five groups is tried, so the card inside is removed and the rest kept.
  function cardSpans(run) {
    const parts = run.split(/([./_\-\p{Zs}]+)/u);
    const offset = [0];
    for (const p of parts) offset.push(offset[offset.length - 1] + p.length);
    const spans = [];
    let start = 0;
    while (start < parts.length) {
      let hit = 0;
      for (let end = Math.min(parts.length, start + 9); end > start; end -= 2) {
        if (cardLike(parts.slice(start, end).join(""))) { hit = end; break; }
      }
      if (hit) { spans.push([offset[start], offset[hit]]); start = hit + 1; }
      else start += 2;
    }
    return spans;
  }
  // Every rule reads one view of the text without in-word invisible characters; what they find is
  // removed from the text as it was written.
  function redactText(text) {
    const s = String(text || "");
    const skip = new Set();
    for (const m of s.matchAll(INVISIBLE_IN_WORD)) for (let i = 0; i < m[0].length; i++) skip.add(m.index + i);
    const at = [];
    let view = "";
    for (let i = 0; i < s.length; i++) if (!skip.has(i)) { at.push(i); view += s[i]; }
    const found = [];
    for (const re of SECRET_SHAPES) for (const m of view.matchAll(re)) if (m[0]) found.push([m.index, m.index + m[0].length]);
    for (const m of view.matchAll(SECRET_ASSIGNED)) {
      if (secretValue(m[3])) found.push([m.index + m[1].length + m[2].length, m.index + m[0].length]);
    }
    for (const m of view.matchAll(/(?<!\p{Nd})\p{Nd}(?:(?:[./_-]|\p{Zs}{1,2})?\p{Nd})*/gu)) {
      for (const [a, b] of cardSpans(m[0])) found.push([m.index + a, m.index + b]);
    }
    found.sort((x, y) => x[0] - y[0] || y[1] - x[1]);
    let out = "";
    let pos = 0;
    let reach = 0;
    for (const [a, b] of found) {
      if (b <= reach) continue;
      if (a >= reach) out += s.slice(pos, at[a]) + "[removed]";
      pos = Math.max(pos, at[b - 1] + 1);
      reach = b;
    }
    return out + s.slice(pos);
  }
  function looksSecret(s) {
    const v = String(s || "");
    return redactText(v) !== v;
  }

  // ---------------------------------------------------------------- markdown (safe subset)

  // Only BugIt addresses become links: an in-site route (#/...) or https on bugit.dev and
  // portal.bugit.dev. Any other address stays readable text, so an answer steered by pasted text can
  // never hand a visitor a working link to somewhere else under BugIt's name.
  const LINK_HOSTS = ["bugit.dev", "www.bugit.dev", "portal.bugit.dev"];
  function allowedLink(url) {
    if (url.startsWith("#/")) return true;
    try {
      const u = new URL(url);
      return u.protocol === "https:" && LINK_HOSTS.includes(u.hostname.toLowerCase());
    } catch (_) {
      return false;
    }
  }

  function anchor(url, text) {
    if (!allowedLink(url.replace(/&amp;/g, "&"))) return text === url ? url : text + " (" + url + ")";
    const internal = url.startsWith("#/");
    return `<a href="${url}"${internal ? "" : ' target="_blank" rel="noopener noreferrer"'}>${text}</a>`;
  }

  // Code spans and finished links are lifted out while a line is rendered and put back last, between
  // private-use marks stripped from the input first, so no text can be read as a placeholder and no
  // address inside a link's text is linked again. Built from code points: the characters are invisible.
  const CODE_OPEN = String.fromCharCode(0xe000);
  const CODE_CLOSE = String.fromCharCode(0xe001);
  const LINK_OPEN = String.fromCharCode(0xe002);
  const LINK_CLOSE = String.fromCharCode(0xe003);
  const NOT_MARK = CODE_OPEN + "-" + LINK_CLOSE;
  const MARKS = new RegExp("[" + NOT_MARK + "]", "g");
  const MD_LINK = new RegExp(String.raw`\[([^\]\n]+)\]\(((?:https?:\/\/|#\/)[^\s)${NOT_MARK}]+)\)`, "g");
  const BARE_URL = new RegExp(String.raw`(^|[\s(])(https?:\/\/[^\s<)${NOT_MARK}]*[^\s<).,;:!?'"${NOT_MARK}])`, "g");
  const BARE_HOST = new RegExp(String.raw`(^|[\s(])((?:portal\.)?bugit\.dev(?:\/[^\s<)${NOT_MARK}]*[^\s<).,;:!?'"${NOT_MARK}])?)`, "g");
  const CODE_BACK = new RegExp(CODE_OPEN + "(\\d+)" + CODE_CLOSE, "g");
  const LINK_BACK = new RegExp(LINK_OPEN + "(\\d+)" + LINK_CLOSE, "g");

  function inline(raw) {
    const codes = [];
    const links = [];
    let s = esc(String(raw).replace(MARKS, "")).replace(/`([^`\n]+)`/g, (m, c) => {
      codes.push(c);
      return CODE_OPEN + (codes.length - 1) + CODE_CLOSE;
    });
    s = s.replace(/\*\*(?=\S)([^*\n]*?\S)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, "$1<em>$2</em>");
    s = s.replace(MD_LINK, (m, text, url) => {
      const html = anchor(url, text);
      if (!html.startsWith("<a ")) return html;
      links.push(html);
      return LINK_OPEN + (links.length - 1) + LINK_CLOSE;
    });
    s = s.replace(BARE_URL, (m, pre, url) => pre + anchor(url, url));
    s = s.replace(BARE_HOST, (m, pre, host) => pre + anchor("https://" + host, host));
    return s.replace(LINK_BACK, (m, i) => links[Number(i)] || "").replace(CODE_BACK, (m, i) => "<code>" + (codes[Number(i)] || "") + "</code>");
  }

  const RE_UL = /^\s*[-*•]\s+/;
  const RE_OL = /^\s*(\d+)[.)]\s+/;
  const RE_FENCE = /^\s*```/;
  const RE_HEAD = /^\s*#{1,6}\s+/;
  const RE_TABLE = /^\s*\|.*\|\s*$/;
  const blockStart = (l) => RE_FENCE.test(l) || RE_UL.test(l) || RE_OL.test(l) || RE_HEAD.test(l) || RE_TABLE.test(l);

  function md(src) {
    const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (RE_FENCE.test(line)) {
        const buf = [];
        i++;
        while (i < lines.length && !RE_FENCE.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
        continue;
      }
      if (RE_TABLE.test(line)) {
        const rows = [];
        while (i < lines.length && RE_TABLE.test(lines[i])) {
          const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
          i++;
          if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        }
        const body = rows.length > 1 ? rows.slice(1) : rows;
        out.push("<ul>" + body.map((c) => "<li>" + c.map(inline).join(": ") + "</li>").join("") + "</ul>");
        continue;
      }
      if (RE_UL.test(line) || RE_OL.test(line)) {
        const ordered = RE_OL.test(line);
        const re = ordered ? RE_OL : RE_UL;
        const start = ordered ? Number(line.match(RE_OL)[1]) : 1;
        const items = [];
        while (i < lines.length && re.test(lines[i])) {
          let item = lines[i].replace(re, "");
          i++;
          while (i < lines.length && lines[i].trim() && !blockStart(lines[i])) item += " " + lines[i++].trim();
          items.push("<li>" + inline(item) + "</li>");
          while (i + 1 < lines.length && !lines[i].trim() && re.test(lines[i + 1])) i++;
        }
        out.push(ordered ? `<ol${start !== 1 ? ` start="${start}"` : ""}>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
        continue;
      }
      if (RE_HEAD.test(line)) {
        out.push("<p><strong>" + inline(line.replace(RE_HEAD, "")) + "</strong></p>");
        i++;
        continue;
      }
      const para = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !blockStart(lines[i])) para.push(lines[i++]);
      out.push("<p>" + para.map(inline).join("<br>") + "</p>");
    }
    return out.join("");
  }

  // ---------------------------------------------------------------- state

  const state = { open: false, wide: false, busy: false, turns: [] };
  let saveTimer = null;

  function save() {
    clearTimeout(saveTimer);
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ open: state.open, wide: state.wide, turns: state.turns.slice(-40) }));
    } catch (_) {
      /* private mode or storage blocked: the conversation lives for this page only */
    }
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }
  function load() {
    try {
      const d = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
      if (!d || !Array.isArray(d.turns)) return;
      state.turns = d.turns.filter((x) => x && (x.role === "user" || x.role === "assistant")).map((x) =>
        x.role === "assistant" && !x.done ? { ...x, done: true, error: x.text || x.handoff ? null : "network" } : x);
      state.open = Boolean(d.open);
      state.wide = Boolean(d.wide);
    } catch (_) {
      /* unreadable: start fresh */
    }
  }

  // ---------------------------------------------------------------- shell

  const live = h("div", { class: "bgd-sr", "aria-live": "polite", "aria-atomic": "true" });
  const launchLabel = h("span", { class: "bgd-launch-label" });
  // NO aria-expanded. It opens a DIALOG, which announces itself and carries its own close button,
  // and aria-expanded is the promise a disclosure makes: press me again and I collapse. This button
  // cannot keep that promise, because the panel it opens sits over it (both are pinned to the same
  // corner), so a second press never reaches it. check-disclosure found it in both engines and it
  // was right to: a control that says it is expanded and cannot be collapsed is a lie to a screen
  // reader. aria-haspopup="dialog" with aria-controls is the pattern for opening a dialog.
  const launch = h("button", { class: "bgd-launch", type: "button", "aria-haspopup": "dialog", "aria-controls": "bgd-panel" },
    h("span", { class: "bgd-launch-avatar", html: blip() }), launchLabel, h("kbd", { class: "bgd-kbd", text: "/" }));

  const titleEl = h("div", { class: "bgd-title", id: "bgd-title" });
  const statusText = h("span");
  const btnNew = h("button", { class: "bgd-icon", type: "button", html: I.fresh });
  const btnExpand = h("button", { class: "bgd-icon bgd-expand", type: "button" });
  const btnClose = h("button", { class: "bgd-icon", type: "button", html: I.close });
  // A div, not a header: a <header> inside the dialog is announced as a second site banner.
  const head = h("div", { class: "bgd-head" },
    h("div", { class: "bgd-avatar", html: blip() }),
    h("div", { style: "min-width:0" }, titleEl, h("div", { class: "bgd-status" }, h("i", { class: "bgd-dot" }), statusText)),
    h("div", { class: "bgd-actions" }, btnNew, btnExpand, btnClose));

  const thread = h("div", { class: "bgd-thread", role: "log", "aria-live": "off" });
  const scroller = h("div", { class: "bgd-scroll" }, thread);

  const warn = h("p", { class: "bgd-warn", role: "alert", hidden: true });
  const inputLabel = h("label", { class: "bgd-sr", for: "bgd-input" });
  const input = h("textarea", { id: "bgd-input", rows: "1", maxlength: String(MAX_INPUT), autocomplete: "off", dir: "auto", enterkeyhint: "send" });
  const sendBtn = h("button", { class: "bgd-send", type: "submit" });
  const compose = h("form", { class: "bgd-compose" }, inputLabel, input, sendBtn);
  const disclaimer = h("span");
  const humanBtn = h("button", { class: "bgd-human", type: "button" });
  const foot = h("div", { class: "bgd-foot" }, warn, compose, h("div", { class: "bgd-foot-row" }, disclaimer, humanBtn));

  const panel = h("section", { class: "bgd-panel", id: "bgd-panel", role: "dialog", "aria-modal": "false", "aria-labelledby": "bgd-title", hidden: true }, head, scroller, foot);
  const root = h("div", { class: "bgd-root" }, launch, panel, live);

  function announce(text, inLang) {
    live.textContent = "";
    // The announcement is the answer, so it is announced AS the answer's language.
    live.lang = inLang || lang;
    setTimeout(() => { live.textContent = String(text).replace(/[`*_#>|]/g, "").slice(0, 400); }, 60);
  }

  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 150) + "px";
  }

  // There is nothing to stop: an answer is looked up here, and the only wait is the one download of
  // the language file. So the button stays Send and is simply unavailable until it can be used.
  function paintSend() {
    sendBtn.innerHTML = I.send;
    sendBtn.setAttribute("aria-label", t("send"));
    sendBtn.title = t("send");
    sendBtn.disabled = state.busy || !input.value.trim();
  }

  function paintExpand() {
    btnExpand.innerHTML = state.wide ? I.shrink : I.expand;
    const k = state.wide ? "collapse" : "expand";
    btnExpand.setAttribute("aria-label", t(k));
    btnExpand.title = t(k);
  }

  function setBusy(b) {
    state.busy = b;
    panel.classList.toggle("bgd-busy", b);
    statusText.textContent = b ? t("statusBusy") : t("status");
    paintSend();
  }

  function applyLang() {
    lang = siteLang();
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    launchLabel.textContent = t("launch");
    launch.setAttribute("aria-label", t("launch"));
    titleEl.textContent = t("title");
    statusText.textContent = state.busy ? t("statusBusy") : t("status");
    for (const [b, k] of [[btnNew, "newChat"], [btnClose, "close"]]) {
      b.setAttribute("aria-label", t(k));
      b.title = t(k);
    }
    paintExpand();
    input.placeholder = t("placeholder");
    inputLabel.textContent = t("inputLabel");
    disclaimer.textContent = t("disclaimer");
    humanBtn.innerHTML = I.person + "<span>" + esc(t("human")) + "</span>";
    paintSend();
    handNodes = new WeakMap();
    renderThread();
  }

  // ---------------------------------------------------------------- thread rendering

  const nodes = new Map();
  let handNodes = new WeakMap();
  let formCount = 0;

  function nearBottom() {
    return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 140;
  }
  function scrollToEnd(force) {
    if (force || nearBottom()) scroller.scrollTop = scroller.scrollHeight;
  }

  function helloNode() {
    const table = I18N[lang] || I18N.en;
    return h("div", { class: "bgd-hello" },
      h("span", { class: "bgd-hello-eyebrow" }, h("i"), t("eyebrow")),
      h("h2", {}, t("h1"), h("span", { text: t("h2") })),
      h("p", { text: t("helloSub") }),
      h("div", { class: "bgd-cards" }, (table.cards || I18N.en.cards).map((c, k) =>
        h("button", { class: "bgd-card", type: "button", onclick: () => ask(c.q) },
          h("b", { html: CARD_ICONS[k] + esc(c.tag) }), h("span", { text: c.q })))),
      h("div", { class: "bgd-langs", role: "list", "aria-label": t("langsLabel") },
        LANGS.map(([code, label]) => h("span", { role: "listitem", lang: code, text: label }))));
  }

  function stateIcon(kind) {
    const glyph = { ok: I.check, none: I.minus, hand: I.dot }[kind] || "";
    return h("span", { class: "bgd-state " + kind, html: glyph });
  }

  function trailNode(i) {
    const turn = state.turns[i];
    const searches = turn.steps.filter((s) => s.kind === "search_knowledge");
    const handed = turn.steps.some((s) => s.kind === "hand_off_to_support");
    const running = !turn.done && (turn.steps.some((s) => s.state === "running") || !turn.text);
    const foundIds = new Set();
    for (const s of searches) for (const f of s.found || []) foundIds.add(f.id);

    let label;
    let icon;
    if (running) {
      label = handed && !searches.length ? table(HAND_LABEL, turn.replyLang) : t("searching");
      icon = "run";
    } else if (!searches.length && handed) {
      label = table(HAND_LABEL, turn.replyLang);
      icon = "hand";
    } else {
      label = foundIds.size ? `${t("searched")} · ${t("found", { n: foundIds.size })}` : `${t("searched")} · ${t("noMatch")}`;
      icon = foundIds.size ? "ok" : "none";
    }

    const details = h("details", { class: "bgd-trail" });
    details.open = turn.trailOpen != null ? turn.trailOpen : running;
    const summary = h("summary", {}, stateIcon(icon), h("span", { text: label }), h("span", { class: "bgd-caret-i", html: I.caret }));
    summary.addEventListener("click", () => { turn.trailOpen = !details.open; saveSoon(); });
    details.append(summary);

    const list = h("ol", { class: "bgd-steps" });
    for (const s of turn.steps) {
      if (s.kind === "search_knowledge") {
        const n = (s.found || []).length;
        const body = h("div", {}, h("span", { text: s.state === "running" ? t("searching") : n ? t("found", { n }) : t("noMatch") }));
        // The queries and article titles are English. Show them to an English interface only, so a
        // visitor reading Japanese is never handed a strip of English they did not ask for.
        if (lang === "en" && s.query) body.append(" ", h("q", { text: s.query }));
        if (lang === "en" && n) body.append(h("div", { class: "bgd-found" }, s.found.slice(0, 4).map((f) => h("span", { text: f.title, title: f.title }))));
        list.append(h("li", { class: "bgd-step" }, stateIcon(s.state === "running" ? "run" : n ? "ok" : "none"), body));
      } else if (s.kind === "hand_off_to_support") {
        list.append(h("li", { class: "bgd-step" }, stateIcon(s.state === "running" ? "run" : "hand"), h("div", { text: table(HAND_LABEL, turn.replyLang) })));
      }
    }
    details.append(list);
    return details;
  }

  function paintAnswerInto(el, turn) {
    if (!turn.text && !turn.done) {
      el.innerHTML = '<span class="bgd-thinking" aria-hidden="true"><i></i><i></i><i></i></span>';
      return;
    }
    // A prepared answer arrives whole, so there is no half-written markdown to close.
    el.innerHTML = md(turn.text);
  }

  // The only failure left is the one download this widget makes.
  function errorNode(i) {
    return h("div", { class: "bgd-error", role: "alert" }, h("span", { text: t("errNetwork") }), h("button", { type: "button", text: t("retry"), onclick: () => retry(i) }));
  }

  function metaNode(i) {
    const turn = state.turns[i];
    const meta = h("div", { class: "bgd-meta" });
    const hrefs = [];
    // Through the same allowlist as every link in an answer. The file is ours, but a link the Guide
    // renders under BugIt's name is checked wherever it came from.
    for (const e of turn.sources || []) for (const l of e.links || []) if (l && l.href && allowedLink(l.href) && !hrefs.includes(l.href)) hrefs.push(l.href);
    if (hrefs.length) {
      meta.append(h("span", { class: "bgd-label", text: t("sources") }));
      for (const href of hrefs.slice(0, 3)) {
        meta.append(h("a", {
          class: "bgd-chip", href, html: I.book + "<span>" + esc(docLabel(href)) + "</span>",
          onclick: () => { if (window.matchMedia("(max-width: 560px)").matches) closePanel(false); },
        }));
      }
    }
    const tools = h("div", { class: "bgd-tools" });
    const copyBtn = h("button", { class: "bgd-icon", type: "button", "aria-label": t("copy"), title: t("copy"), html: I.copy });
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(turn.text);
        copyBtn.innerHTML = I.check;
        copyBtn.setAttribute("aria-label", t("copied"));
        announce(t("copied"));
        setTimeout(() => { copyBtn.innerHTML = I.copy; copyBtn.setAttribute("aria-label", t("copy")); }, 1400);
      } catch (_) {
        /* clipboard refused; nothing to undo */
      }
    });
    const feedback = (kind) => h("button", {
      class: "bgd-icon", type: "button", html: I[kind],
      "aria-label": t(kind === "up" ? "good" : "bad"), title: t(kind === "up" ? "good" : "bad"),
      "aria-pressed": turn.feedback === kind ? "true" : "false",
      onclick: () => {
        turn.feedback = turn.feedback === kind ? null : kind;
        save();
        refreshTurn(i);
        if (turn.feedback) announce(t("thanks"));
      },
    });
    tools.append(copyBtn, feedback("up"), feedback("down"));
    meta.append(tools);
    return meta;
  }

  function followNode(turn) {
    return h("div", { class: "bgd-follows" },
      h("span", { class: "bgd-label", text: turn.suggest ? table(SUGGEST_LABEL, turn.replyLang) : t("related", null, turn.replyLang) }),
      turn.followups.map((q) => h("button", { class: "bgd-follow", type: "button", dir: "auto", onclick: () => ask(q) }, h("span", { html: I.next }), h("span", { text: q }))));
  }

  function handoffEl(i) {
    const hd = state.turns[i].handoff;
    let el = handNodes.get(hd);
    if (!el) {
      el = buildHandoff(i);
      handNodes.set(hd, el);
    }
    return el;
  }

  /**
   * The handoff: a button that opens the visitor's own email application, addressed to support, with
   * the question already written. The prototype posted a form to its own server; this site has none,
   * and the owner chose the email link on 2026-09-20 over building one. Nothing is sent from here,
   * so nothing can be sent without the visitor seeing it: they press send in their own mail app.
   */
  function buildHandoff(i) {
    const turn = state.turns[i];
    const hd = turn.handoff;
    // The answer above this card is in the language the visitor wrote in, so the card is too.
    const l = turn.replyLang;
    const uid = "bgd-h" + ++formCount;
    const wrap = h("div", { class: "bgd-hand", role: "group", "aria-labelledby": uid + "-t", lang: l || null, dir: l === "ar" ? "rtl" : null });
    wrap.append(h("div", { class: "bgd-hand-top" },
      h("span", { class: "bgd-hand-icon", html: I.person }),
      h("h3", { id: uid + "-t", text: t("ticketTitle", null, l) })));
    wrap.append(h("p", { text: table(MAIL_NOTE, l) }));
    wrap.append(h("a", {
      class: "bgd-primary bgd-mail", href: mailtoFor(hd),
      html: esc(table(MAIL_LABEL, l)) + I.send,
    }));
    return wrap;
  }

  /**
   * Half of a surrogate pair on its own is not valid text, and encodeURIComponent THROWS on it
   * rather than escaping it. One emoji cut in half by a length limit was enough to leave the
   * visitor with no email link at all, which is the one route to a person this build has.
   */
  function whole(text) {
    return String(text == null ? "" : text).replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  }

  function mailtoFor(hd) {
    // The subject is the topic the prepared answer named, or the visitor's own first line.
    const question = whole(hd.details);
    const subject = whole(hd.subject).trim() || whole(question.split("\n")[0].slice(0, 80));
    return "mailto:" + SUPPORT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(question);
  }

  function turnNode(i) {
    const turn = state.turns[i];
    if (turn.role === "user") return h("div", { class: "bgd-me", dir: "auto", text: turn.text });
    const node = h("div", { class: "bgd-bot" });
    if (turn.steps && turn.steps.length) node.append(trailNode(i));
    if (!turn.manual) {
      const answer = h("div", { class: "bgd-answer", dir: "auto", lang: turn.replyLang || null });
      paintAnswerInto(answer, turn);
      node.append(answer);
    }
    if (turn.error) node.append(errorNode(i));
    if (turn.handoff) node.append(handoffEl(i));
    if (turn.done && turn.text && !turn.manual && !turn.error) node.append(metaNode(i));
    const isLast = i === state.turns.length - 1;
    if (turn.done && isLast && !turn.handoff && turn.followups && turn.followups.length) node.append(followNode(turn));
    return node;
  }

  function renderThread() {
    thread.textContent = "";
    nodes.clear();
    if (!state.turns.length) {
      thread.append(helloNode());
      return;
    }
    state.turns.forEach((_, i) => {
      const n = turnNode(i);
      nodes.set(i, n);
      thread.append(n);
    });
  }

  function appendTurn(i) {
    const hello = thread.querySelector(".bgd-hello");
    if (hello) hello.remove();
    const n = turnNode(i);
    nodes.set(i, n);
    thread.append(n);
  }

  function refreshTurn(i) {
    const old = nodes.get(i);
    if (!old || !old.isConnected || !state.turns[i]) return renderThread();
    const active = document.activeElement;
    const range = active && typeof active.selectionStart === "number" ? [active.selectionStart, active.selectionEnd] : null;
    // WHERE the focus was, not which node held it. The feedback buttons are rebuilt by this very
    // call, so the node is gone by the time we try to give it the focus back: pressing Helpful with
    // the keyboard dropped the focus out of the panel entirely. Counting among its own kind inside
    // the turn survives the rebuild.
    const inOld = active && old.contains(active);
    const mark = inOld
      ? { tag: active.tagName, cls: active.getAttribute("class") || "", at: [...old.querySelectorAll(active.tagName)].filter((e) => (e.getAttribute("class") || "") === (active.getAttribute("class") || "")).indexOf(active) }
      : null;
    const n = turnNode(i);
    old.replaceWith(n);
    nodes.set(i, n);
    // Rebuilding a turn moves its controls, and moving a focused field drops the focus. Someone
    // typing while the answer finished must not lose their place.
    if (active && active !== document.activeElement && active.isConnected && panel.contains(active)) {
      active.focus({ preventScroll: true });
      if (range) try { active.setSelectionRange(range[0], range[1]); } catch (_) { /* not a text field */ }
    } else if (mark && !(active && active.isConnected)) {
      const kin = [...n.querySelectorAll(mark.tag)].filter((e) => (e.getAttribute("class") || "") === mark.cls);
      const want = kin[mark.at] || kin[0];
      if (want) want.focus({ preventScroll: true });
    }
  }

  function paintTrail(i) {
    const n = nodes.get(i);
    if (!n) return;
    const fresh = trailNode(i);
    const old = n.querySelector(".bgd-trail");
    if (old) old.replaceWith(fresh);
    else n.prepend(fresh);
  }

  // ---------------------------------------------------------------- the prepared answers
  //
  // ONE LANGUAGE AT A TIME. A bank is about half a megabyte, so it is downloaded when a visitor
  // first needs that language and kept for the page. Eleven of them, to settle the wording of one
  // question, would cost the visitor far more than it could save.

  const docs = new Map();
  let bank = buildPreparedBank([], DID_YOU_MEAN);
  let sources = null;

  async function ensureLanguage(code) {
    if (docs.has(code)) return;
    const res = await fetch(BANK_BASE + code + ".json", { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error("prepared answers " + res.status);
    const doc = await res.json();
    docs.set(code, { lang: code, items: Array.isArray(doc.items) ? doc.items : [] });
    bank = buildPreparedBank([...docs.values()], DID_YOU_MEAN);
  }

  /**
   * The language to answer in. The owner's rule is that the Guide answers in the language the
   * visitor writes in, even when the site is set to another one; when the message is too short or
   * too mixed to tell, the site's language stands.
   */
  async function replyLanguage(text) {
    const guessed = guessLanguage(text);
    if (guessed && PREPARED_LANGS.includes(guessed)) {
      await ensureLanguage(guessed);
      return guessed;
    }
    return languageFromBank(bank, text) || lang;
  }

  /** Where the entry behind an answer can be read on the site, for the Sources chips. */
  async function entrySources(item) {
    const ids = item.kind === "entry" && item.entry ? [item.entry] : (item.cited || []);
    if (!ids.length) return [];
    if (!sources) {
      try {
        const res = await fetch(SOURCES_URL, { headers: { accept: "application/json" } });
        sources = res.ok ? await res.json() : {};
      } catch (_) {
        sources = {}; // no chips this time; the answer itself is what matters
      }
    }
    return ids.filter((id) => sources[id]).map((id) => ({ id, links: sources[id] }));
  }

  // ---------------------------------------------------------------- conversation

  async function ask(text) {
    text = String(text || "").trim().slice(0, MAX_INPUT);
    if (!text || state.busy) return;
    if (!state.open) openPanel(false);
    const prevLast = state.turns.length - 1;
    state.turns.push({ role: "user", text });
    const turn = { role: "assistant", text: "", steps: [], sources: [], followups: [], handoff: null, error: null, done: false };
    state.turns.push(turn);
    const i = state.turns.length - 1;
    if (prevLast >= 0 && nodes.has(prevLast)) refreshTurn(prevLast);
    appendTurn(i - 1);
    appendTurn(i);
    scrollToEnd(true);
    setBusy(true);
    save();

    // The same disclosure the prototype showed, and as honest here: the bank is searched, and the
    // visitor is told what was found. The query and the article titles are English, so the trail
    // shows them to an English interface only (trailNode).
    const step = { id: "p1", kind: "search_knowledge", state: "running", query: text.slice(0, 120), found: [] };
    turn.steps.push(step);
    paintTrail(i);
    const alive = () => state.turns[i] === turn;

    try {
      await ensureLanguage(lang);
      const reply = await replyLanguage(text);
      const decision = answerFor(bank, reply, text);
      turn.replyLang = reply;
      step.state = "done";
      if (decision.kind === "answer") {
        turn.text = decision.answer;
        turn.followups = decision.related;
        turn.sources = await entrySources(decision.item);
        step.found = [{ id: decision.item.id, title: decision.item.question }];
      } else if (decision.kind === "person") {
        // A topic only a person can settle (a refund, a data request, a quote): its prepared reply
        // says so, and the email is prepared with the subject the bank names.
        turn.text = decision.item.reply;
        // What matched is a topic for a person, not an article to read: the trail says that and
        // nothing else, rather than "Relevant articles: 1" with no article on screen.
        turn.steps = [];
        turn.handoff = {
          subject: undash(decision.item.subject || "", reply),
          details: text,
          category: decision.item.category || "other",
          reason: decision.item.reason || "",
        };
        turn.steps.push({ id: "p2", kind: "hand_off_to_support", state: "done" });
      } else if (decision.kind === "suggest") {
        turn.text = DID_YOU_MEAN[reply] || DID_YOU_MEAN.en;
        turn.followups = decision.questions;
        turn.suggest = true;
      } else {
        turn.text = NO_ANSWER[reply] || NO_ANSWER.en;
        turn.handoff = { subject: "", details: text, category: "other", reason: "not covered by the prepared answers" };
        turn.steps.push({ id: "p2", kind: "hand_off_to_support", state: "done" });
      }
    } catch (_) {
      // The one thing that can fail is downloading the answers themselves.
      step.state = "done";
      turn.error = "network";
    } finally {
      turn.done = true;
      setBusy(false);
      if (alive()) {
        refreshTurn(i);
        scrollToEnd(false);
        if (turn.text) announce(turn.text, turn.replyLang);
      }
      save();
    }
  }

  function retry(i) {
    // Only the last exchange can be retried: ask() appends, so retrying an earlier one would move it
    // to the end and silently reorder the conversation.
    if (state.busy || i !== state.turns.length - 1) return;
    const prev = state.turns[i - 1];
    if (!prev || prev.role !== "user") return;
    const q = prev.text;
    state.turns.splice(i - 1, 2);
    renderThread();
    ask(q);
  }

  function talkToPerson() {
    if (!state.open) openPanel(false);
    const last = state.turns[state.turns.length - 1];
    if (last && last.handoff) {
      const el = handNodes.get(last.handoff);
      if (el) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        const link = el.querySelector("a");
        if (link) link.focus({ preventScroll: true });
      }
      return;
    }
    const lastUser = [...state.turns].reverse().find((x) => x.role === "user");
    // The card, its labels and the email are written in the language the visitor was ANSWERED in.
    // Pressing "Talk to a person" after a German answer used to produce an English card, because
    // only the automatic hand-off recorded the reply language.
    const lastBot = [...state.turns].reverse().find((x) => x.role === "assistant" && x.replyLang);
    const guessed = lastUser ? guessLanguage(lastUser.text) : null;
    const turn = {
      role: "assistant", text: "", manual: true, done: true, steps: [],
      replyLang: (lastBot && lastBot.replyLang) || (guessed && PREPARED_LANGS.includes(guessed) ? guessed : null),
      // The whole question, exactly as the automatic hand-off sends it. It used to be cut at 1200
      // characters although the composer accepts 2000, so the team read two thirds of a question.
      handoff: { manual: true, subject: "", details: lastUser ? lastUser.text : "", category: "other", reason: "visitor asked for a person" },
    };
    state.turns.push(turn);
    renderThread();
    save();
    requestAnimationFrame(() => {
      const el = handNodes.get(turn.handoff);
      if (!el) return;
      scrollToEnd(true);
      const link = el.querySelector("a");
      if (link) link.focus({ preventScroll: true });
    });
  }

  function newChat() {
    state.turns = [];
    handNodes = new WeakMap();
    warn.hidden = true;
    renderThread();
    save();
    input.focus();
  }

  // ---------------------------------------------------------------- open, close, size

  // The banner is a decision the visitor has to make; the Guide is not. While it is up, the Guide
  // stays out of the way, launcher AND panel.
  function consentUp() {
    const el = document.getElementById("consentBanner");
    // NOT offsetParent. It is null for a position:fixed element by definition, and this banner is
    // fixed to the bottom of the viewport, so the whole gate was inert: both ways past it, the "/"
    // shortcut and a saved open state, went straight through while the CSS rule that hides the
    // launcher kept the failure invisible. getClientRects() is empty only when the element really
    // is not being rendered, fixed or not.
    return Boolean(el && !el.hidden && el.getClientRects().length > 0);
  }

  function openPanel(focus = true) {
    if (consentUp()) return;
    state.open = true;
    panel.hidden = false;
    panel.classList.toggle("bgd-wide", state.wide);
    requestAnimationFrame(() => scrollToEnd(true));
    if (focus) setTimeout(() => input.focus({ preventScroll: true }), 40);
    save();
  }

  function closePanel(returnFocus = true) {
    state.open = false;
    panel.hidden = true;
    if (returnFocus) launch.focus({ preventScroll: true });
    save();
  }

  function toggleWide() {
    state.wide = !state.wide;
    panel.classList.toggle("bgd-wide", state.wide);
    paintExpand();
    save();
  }

  // ---------------------------------------------------------------- wiring

  // The launcher TOGGLES. It carries aria-expanded, so a button that says it is expanded and does
  // nothing when pressed again is a control that lies to a screen reader and to everyone else: on a
  // phone the panel covers the screen and pressing the thing that opened it is the obvious way to
  // put it away. Found by check-disclosure, which opens every disclosure on the page and closes it.
  launch.addEventListener("click", () => (state.open ? closePanel(true) : openPanel(true)));
  btnClose.addEventListener("click", () => closePanel(true));
  btnExpand.addEventListener("click", toggleWide);
  btnNew.addEventListener("click", newChat);
  humanBtn.addEventListener("click", talkToPerson);

  compose.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.busy) return;
    const value = input.value.trim();
    if (!value) return;
    if (looksSecret(value)) {
      warn.textContent = t("errSecret");
      warn.hidden = false;
      return;
    }
    warn.hidden = true;
    input.value = "";
    autosize();
    paintSend();
    ask(value);
  });

  input.addEventListener("keydown", (e) => {
    // isComposing and keyCode 229: an input method (Japanese, Chinese, Korean) is still composing,
    // and its Enter confirms a word rather than sending the message.
    if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (!state.busy) compose.requestSubmit();
  });
  input.addEventListener("input", () => {
    autosize();
    paintSend();
    if (!warn.hidden) warn.hidden = true;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.open) {
      // Closes wherever focus is; focus goes back to the launcher only when it was inside the panel.
      const inside = panel.contains(document.activeElement);
      e.preventDefault();
      closePanel(inside);
      return;
    }
    if (e.key === "/" && !state.open && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const el = e.target;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      openPanel(true);
    }
  });

  new MutationObserver(() => {
    if (siteLang() !== lang) applyLang();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  load();
  document.body.append(root);
  applyLang();
  // A saved "open" from before a reload reopens the panel, but not over the consent banner.
  //
  // WHEN that question is asked decides the answer. app.js shows the banner from its own
  // DOMContentLoaded handler, and this file is a module, so it runs BEFORE that: asked here, at
  // boot, the answer was always "no banner", and the panel reopened on top of one that appeared a
  // moment later. So the restore waits for the same event (app.js registered its handler first, so
  // the banner is up by the time this runs), and the observer holds the rule for the rest of the
  // page's life, including the footer's "Cookie preferences" link, which brings the banner back.
  function restoreOpen() {
    if (!state.open) return;
    state.open = false;
    openPanel(false);
  }
  // A deferred module runs while readyState is ALREADY "interactive", so asking for "loading" here
  // meant the restore never waited for anything and the panel opened for a frame before the banner
  // existed. DOMContentLoaded is the event app.js shows the banner from, and this handler is
  // registered after its, so it runs after it. `load` is the way back for a copy of this file that
  // is injected later, when DOMContentLoaded is already long gone.
  let restored = false;
  const restoreOnce = () => {
    if (restored) return;
    restored = true;
    restoreOpen();
  };
  if (document.readyState === "complete") restoreOnce();
  else {
    document.addEventListener("DOMContentLoaded", restoreOnce);
    window.addEventListener("load", restoreOnce);
  }

  const bannerEl = document.getElementById("consentBanner");
  if (bannerEl) {
    new MutationObserver(() => {
      // Only while the visitor has still to make the choice. Once they have made one, the banner
      // coming back is them opening their own cookie preferences from the footer, and closing the
      // Guide on top of that would be the widget taking a decision away from them.
      const decided = Boolean(window.BugitConsent && window.BugitConsent.hasDecision && window.BugitConsent.hasDecision());
      if (state.open && consentUp() && !decided) closePanel(false);
    }).observe(bannerEl, { attributes: true, attributeFilter: ["hidden"] });
  }
})();
