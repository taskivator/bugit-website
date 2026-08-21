// Take manual control of scroll restoration. Left at the default "auto", the
// browser restores the PRIOR scroll offset on reload; on iOS Safari's
// pull-to-refresh that restoration (against this JS-built page + fixed background)
// lands at the bottom, so a refresh appeared to "jump to the end". Manual means a
// fresh load starts at the top; initInitialScroll() below then positions to a real
// in-page anchor when one is present. Set as the very first statement so it wins
// before the browser attempts restoration.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
// Arm the Mission Control animation before first paint (this script runs after the
// mission markup is parsed), so the report assembles from empty instead of flashing
// its full content first. Skipped for reduced-motion / no-JS, which show the finished
// state statically. initMission() drives the loop on DOMContentLoaded.
(function armMission(){try{var m=document.querySelector('.mission');if(!m)return;var rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!rm)m.classList.add('mc-armed');}catch(e){}})();
// A refresh must land at the top of the page — it must never re-jump to a section
// like #features that an earlier in-page nav click left in the URL. On a RELOAD
// only, strip an in-page section hash before it is honored (by initInitialScroll
// or the browser's own fragment scroll), so a refresh behaves exactly like a fresh
// top-of-page load. Genuine deep links (a shared/bookmarked #features), #/docs
// routes, and forward/back navigation are all left untouched — only same-URL
// reloads are normalized.
(function () {
  try {
    var e = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]) || null;
    var isReload = e ? e.type === "reload" : (performance.navigation && performance.navigation.type === 1);
    if (isReload && location.hash && location.hash.indexOf("#/") !== 0) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  } catch (_) {}
})();
const languages=[['en','English'],['ja','日本語'],['fr','Français'],['de','Deutsch'],['es','Español'],['pt-br','Português BR'],['it','Italiano'],['ko','한국어'],['zh','中文'],['ru','Русский'],['ar','العربية']];
/* Right-to-left scripts. `dir` is set from this on every language change, because an RTL
   page is a different LAYOUT, not right-aligned text: mirroring is what CSS logical
   properties key off, and without it the nav, the cards and the docs sidebar all stay on
   the wrong side. */
const RTL_LOCALES=new Set(['ar']);
const toolData={
 jira:['Jira','#2684ff','M5 5h22v22H5z M11 8l6 6-6 6-6-6z'],azuredevops:['Azure DevOps','#0078d7','M4 8l11-4 13 4v16l-13 4L4 24l9-2V10z'],github:['GitHub','#fff','M16 3a13 13 0 0 0-4 25c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.5-1.4-1.9-1.4-1.9-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.4 1.2a11.7 11.7 0 0 1 6.2 0C22.7 8 23.7 8.3 23.7 8.3c.6 1.7.2 3 .1 3.3.8.9 1.2 2 1.2 3.3 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .4.2.8.8.6A13 13 0 0 0 16 3z'],gitlab:['GitLab','#fc6d26','M16 27l4.4-13.4h-8.8L16 27z M3 13.6l13 13.4-4.4-13.4H3z M29 13.6H20.4L16 27l13-13.4z M3 13.6l2.5-7.8c.2-.6 1-.6 1.2 0l4.9 7.8H3z M29 13.6l-2.5-7.8c-.2-.6-1-.6-1.2 0l-4.9 7.8H29z'],linear:['Linear','#5e6ad2','M6 22L22 6M10 26L26 10M6 14l8-8M18 26l8-8'],shortcut:['Shortcut','#58b9ff','M6 8c5-5 15-5 20 0L8 26c-5-5-5-15-2-18zM26 24c-5 5-15 5-20 0L24 6c5 5 5 15 2 18z'],youtrack:['YouTrack','#ff2d87','M7 5h18a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M10 22h8M10 10h8v8h-8z'],bugzilla:['Bugzilla','#b86bff','M10 9c2-4 10-4 12 0 3 1 5 4 5 8 0 6-5 10-11 10S5 23 5 17c0-4 2-7 5-8z M9 6l3 4M23 6l-3 4'],clickup:['ClickUp','#7b68ee','M7 19l9 7 9-7-3-4-6 5-6-5z M7 12l9-7 9 7-3 4-6-5-6 5z'],asana:['Asana','#f06a6a','M16 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM9 28a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 28a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],trello:['Trello','#0c66e4','M6 5h20a1 1 0 0 1 1 1v20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M9 8h6v11H9z M17 8h6v7h-6z'],sentry:['Sentry','#fff','M16 5l12 21h-7l-5-9-5 9H4z M16 12l7 12M16 12L9 24'],crashlytics:['Crashlytics','#ffca28','M16 3c7 7 9 15 0 26C7 18 9 10 16 3z M16 9c-3 6-3 10 0 15 3-5 3-9 0-15z'],bugsnag:['BugSnag','#4949e4','M6 6h20v20H6z M10 11h8a4 4 0 0 1 0 8h-8z M10 19h9a3 3 0 0 1 0 6h-9z'],testrail:['TestRail','#65c179','M8 6h16v4H8z M8 14h16v4H8z M8 22h16v4H8z M6 8l-2 2-1-1M6 16l-2 2-1-1M6 24l-2 2-1-1'],xray:['Xray','#35d06e','M6 6l20 20M26 6L6 26M10 6h12v4H10zM10 22h12v4H10z'],confluence:['Confluence','#1d7afc','M7 20c4-7 9-8 15-5l3 2-3 5-3-2c-3-1-5 0-7 4z M25 12c-4 7-9 8-15 5l-3-2 3-5 3 2c3 1 5 0 7-4z'],notion:['Notion','#fff','M6 5l15-1 5 4v19l-16 1-4-4z M10 10v13M13 10l7 12V10'],slack:['Slack','#36c5f0','M12 4a3 3 0 0 1 3 3v7h-3a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z M4 12a3 3 0 0 1 3-3h7v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z M20 28a3 3 0 0 1-3-3v-7h3a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3z M28 20a3 3 0 0 1-3 3h-7v-3a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3z'],teams:['Teams','#6264a7','M5 9h10v14H5z M17 12h10v8a5 5 0 0 1-10 0z M20 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],googledrive:['Google Drive','#34a853','M12 4h8l8 14h-8z M4 18l8-14 4 7-8 14z M8 25l4-7h16l-4 7z'],amazons3:['Amazon S3','#ff9900','M16 4l10 5v14l-10 5-10-5V9z M6 9l10 5 10-5M16 14v14']
};
const i18n={
 en:{name:'English',nav:{features:'Features',integrations:'Integrations',pricing:'Pricing',docs:'Documentation',faq:'FAQ'},footer:{rights:'All Rights Reserved.'},a11y:{openMenu:'Open menu',linkedin:'BugIt on LinkedIn (opens in a new tab)',youtube:'BugIt on YouTube (opens in a new tab)',demoTabs:'Choose a demo',skipToContent:'Skip to content',closeMenu:'Close menu',language:'Language',siteNav:'Site navigation',footerNav:'Footer navigation',home:'BugIt home',demoCore:'Demo video: the core BugIt workflow, from a rough note to a filed ticket',demoSaas:'Demo video: BugIt in a SaaS web app QA workflow',demoGame:'Demo video: BugIt in a game QA workflow',demoMobile:'Demo video: BugIt in a mobile app QA workflow'},cta:{early:'Get BugIt',demo:'Watch Demo'},hero:{title:'The AI QA engineer that <span>learns your project.</span>',subtitle:'BugIt learns your project: its terminology, severity rules, and past tickets. Then it turns rough notes into reviewed, duplicate-checked, privacy-safe reports, ready for your tracker.',badge:'BugIt QA Agent'},metrics:{savedNum:'Ready in seconds',saved:'Rough notes to a filed report',dupeNum:'Understands your project',dupe:'Terminology, severity, past tickets',setupNum:'Finds duplicates',setup:'Flags related issues before you file',privateNum:'Private by design',private:'No telemetry. Your data stays yours.'},under:{features:'✓ No monthly subscription',approval:'✓ Human approval before filing',updates:'✓ Free software updates',private:'✓ 7-day refund policy'},mission:{produces:"BugIt wrote the report below",head:'PROJECT LEARNING',profile:'Learned project terminology',workflow:'Imported QA workflow',glossary:'Loaded severity rules',severity:'Classified component & environment',duplicate:'Duplicate analysis complete',redaction:'Privacy scan complete',format:'Tracker formatting ready',ready:'Awaiting your approval',window:'BugIt Mission Control',phases:['Reading project','Importing workflow','Loading severity','Classifying','Duplicates','Privacy scan','Formatting'],acts:['Reading project glossary','Importing QA workflow','Loading severity rules','Classifying component and environment','Searching duplicate index','Scanning for sensitive information','Formatting report'],resGloss:'{n} terminology entries loaded',resWorkflow:'QA workflow imported',resSeverity:'Severity matrix detected',resClass:'{comp} in {env}',resPrivacy:'Privacy scan passed',resFormat:'Tracker formatting complete',initializing:'Initializing',complete:'Complete',readyStream:'Ready for your approval'},report:{showFull:"Show full report",hideFull:"Hide full report",label:'AI QA ANALYSIS',progress:'Complete · 100%',title:'Login button becomes permanently disabled after rapid sign-in attempts',metaSevL:'Severity',metaSevV:'High',metaCompL:'Component',metaCompV:'Authentication',metaEnvL:'Environment',metaEnvV:'Production',metaDupL:'Duplicate',metaDupV:'1 related, none exact',summaryTitle:'Summary',summary:'Tapping Login several times during sign-in disables the button with no error shown, leaving the user stuck on the sign-in screen.',analysisTitle:'AI analysis',analysis:'Reproduced from the attached log: repeated 401s on token refresh leave the button disabled with no error surfaced. Classified as Authentication and rated High on the project’s severity matrix, since sign-in is blocked for real users. One related ticket exists, but none is an exact duplicate.',pre:'Steps to reproduce\n1. Open the sign-in page and enter valid credentials\n2. Tap Login several times quickly\n\nExpected   Signed in once.\nActual     Button locks; sign-in fails silently.\n\nFrom the log   Repeated 401 on /session/refresh after token expiry.',checkedTitle:'Automatically checked',chkSeverity:'Severity',chkComponent:'Component',chkEnv:'Environment',chkDupe:'Duplicate search',chkPii:'PII scan',chkFormat:'Tracker formatting',privacyLabel:'Privacy',privacyVal:'Passed',qualityLabel:'Quality',qualityVal:'Grade A',submitLabel:'Submission',submitVal:'Manual approval',exportLabel:'Export',exportVal:'Jira · ADO · GitHub',metaDupRes:'1 related issue found, none exact',scenB:{title:'Annual plan checkout charges the monthly price',sev:'High',comp:'Billing',env:'Production',dup:'No exact duplicate',dupRes:'No related issues found',summary:'Choosing the annual plan at checkout applies the monthly rate, so the invoice total is wrong and customers are undercharged.',analysis:'Reproduced from the screen recording: the annual toggle updates the visible label but not the amount sent to the payment API. Classified as Billing and rated High on the project’s severity matrix, since it affects charges on live accounts. No exact duplicate was found in the tracker.',pre:'Steps to reproduce\n1. Open the pricing page and switch the plan to Annual\n2. Complete checkout with a test card\n\nExpected   Invoice shows the annual total.\nActual     Invoice shows the monthly rate.\n\nFrom the log   checkout.amount sent as monthlyPrice.'},scenC:{title:'Screenshots added as evidence appear rotated in the report preview',sev:'Medium',comp:'Attachments',env:'Staging',dup:'2 related, none exact',dupRes:'2 related issues found, none exact',summary:'Portrait screenshots attached to a report show sideways in the preview, making the highlighted area hard to read before filing.',analysis:'Reproduced from the attached image: EXIF orientation is dropped when the preview thumbnail is generated. Classified as Attachments and rated Medium, since the original file is stored intact. Two related tickets exist, but none is an exact duplicate.',pre:'Steps to reproduce\n1. Start a report and attach a portrait screenshot\n2. Open the report preview\n\nExpected   Image shown upright.\nActual     Image rotated 90 degrees.\n\nFrom the log   thumbnail generated without EXIF orientation.'}},demo:{eyebrow:'SEE IT WORK',title:'One agent. Different QA worlds.',subtitle:'Use it for web, mobile, desktop, SaaS, enterprise workflows or games.',core:'Core Workflow',saas:'SaaS / Web App',game:'Game QA',mobile:'Mobile App'},integrations:{eyebrow:'WORKS WITH YOUR TOOLS',title:'Connect what you already use.',lede:'All eleven trackers include built-in tested field mapping, and BugIt files to every one of them with a credential you create in your own account: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana and Trello. BugIt validates your own credential and destination before it saves the connection. Crash tools, test management and other services connect through your own MCP server so your assistant can read them.',builtin:'BUILT-IN TESTED MAPPING',mcp:'VIA YOUR MCP SERVER',crash:'CRASH & TEST',knowledge:'KNOWLEDGE & COLLAB',note:'⌁ Turn on a supported tool in setup. Connect once, use everywhere. Storage services like Amazon S3 and Google Drive aren’t set up automatically.'},pricing:{limitedTag:'LIMITED',soloTitle:'SOLO LICENSE',teamTitle:'TEAM LICENSE',seats:'',perYear:' one-time',soloTerm:'1-year Solo license · does not auto-renew',teamTerm:'1-year Team license · does not auto-renew',limited:'Introductory price',soloRegular:'Regular price $59.99',teamRegular:'Regular price $249.99',refundNote:'Backed by a 7-day refund policy.',refundLink:'Read the refund policy',soloDevice:'1 device (one user)',allFeatures:'All features included',updates:'Free software updates while active',docs:'Documentation & guides',support:'Email support',teamDevices:'Up to 5 members, each with their own account',teamWorkflow:'Shared QA workflow',teamConfig:'Shared project configuration',teamSeverity:'Consistent severity & categories',teamTools:'Team setup tools',priority:'Priority support',teamCta:'Get BugIt Team',soloCta:'Get BugIt Solo'},trust:{privateTitle:'Private by Design',private:'Your work goes only to the AI and tracker you connect, never to Taskivator. We never store, train on, or sell your data.',telemetryTitle:'No Agent Telemetry',telemetry:'The BugIt software sends no product telemetry. This website uses Cloudflare Web Analytics for performance.',previewTitle:'Preview Before Filing',preview:'You review every ticket and approve each filing by typing FILE IT.',backupsTitle:'Local Backups',backups:'Your settings and activity stay on your machine. Easy backups anytime.',updatesTitle:'Secure Updates',updates:'Updates are cryptographically signed and verified before installation.',vscodeTitle:'Runs in VS Code',vscode:'Native to VS Code, so there is no separate app to install. You will also need Copilot (or your own AI key) and Python.'},faq:{title:'Launch details, without surprises.',items:[['Does BugIt file automatically?','No. Every ticket, comment, attachment or notification is previewed first. Before an irreversible filing, you approve it by typing FILE IT; chat text alone never files. A plain "yes" is not enough. Use dry run for zero-write practice.'],['Which trackers have built-in tested mapping?','All eleven trackers include built-in tested field mapping, and BugIt files to every one of them with a credential you create in your own account: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana and Trello. BugIt validates your own credential and destination before it saves the connection. Crash tools, test management and other services connect through your own MCP server so your assistant can read them.'],['Do I need GitHub Copilot?','GitHub Copilot is recommended and easiest. BugIt also works with the Claude extension in VS Code, another assistant, or a plain terminal. Filing is a command, so it works the same in all of them.'],['Can I use Claude, Gemini or GPT?','Yes. Inside GitHub Copilot, use the models available to your Copilot plan. Standalone mode supports your own OpenAI or Anthropic key.'],['Does Taskivator see my work?','No. Your bug reports, specs, glossary, screenshots and settings are never sent to Taskivator.'],['What is included in Team?','BugIt Team is available now. A one-time payment covers a 1-year license for up to 5 members, and each member gets their own BugIt account, their own sign-in, and their own device activation, instead of a shared license. Team configuration is shared and managed centrally in the Portal, and it does not auto-renew. Solo is unaffected and available too.'],['Can I practice without filing?','Yes. Use dry run to generate a full report without creating tickets, comments or notifications. Dry run stops BugIt’s bundled helpers from writing and tells the agent to refuse tracker writes; that refusal follows BugIt’s instructions rather than a platform lock, so use read-only credentials when evaluating.'],['Can I customize BugIt?','Yes. You can configure your glossary, categories, platforms, house style and tracker settings for your project.'],['Does BugIt support screenshots?','Yes. BugIt opens a folder on your machine for screenshots, recordings and logs, prepares them for your tracker, and uploads them after you approve. An image pasted into chat can be read but never attached, so BugIt asks for the folder instead. Uploads land on eight of the eleven trackers.'],['How do updates work?','BugIt backs up your settings, verifies signed updates, and preserves your setup.'],['What happens when my license expires?','You keep your local files and settings. Filing features require an active license.'],['How do I get support?','Email the in-app Support page. Please do not send confidential project information.']]},docs:{eyebrow:'DOCUMENTATION',getting:'Getting Started',gettingDesc:'Set up BugIt in minutes.',user:'User Guide',userDesc:'Complete guide to features and workflows.',license:'License Agreement',licenseDesc:'Read the terms for using BugIt.',privacy:'Privacy Policy',privacyDesc:'How we collect, use and protect your data.',refund:'Refund Policy',refundDesc:'Our 7-day refund policy.',commerce:'Commercial Transactions',commerceDesc:'Seller and transaction details (特定商取引法に基づく表記).',faqDesc:'Answers to common questions.',support:'Support',supportDesc:'Get help and open a support ticket.'},docPages:{homeTitle:'Documentation',commerceTitle:'Commercial Transactions',commerceIntro:'Seller and transaction information for BugIt, including the information provided for mail order sales in Japan under the Act on Specified Commercial Transactions (特定商取引法).',homeIntro:'Everything you need to install, activate, customize and use BugIt safely.',refundTitle:'Refund Policy',refundIntro:'Our refund policy for BugIt license purchases.',gettingTitle:'Getting Started',userTitle:'User Guide',licenseTitle:'License Agreement',privacyTitle:'Privacy Policy',faqTitle:'FAQ',supportTitle:'Support',supportIntro:'Need help with setup or licensing? Email the in-app Support page.',download:'Download PDF',before:'Before sending',beforeText:'Please do not include confidential source code, customer data, private tickets or secrets.',sections:['Install VS Code and GitHub Copilot, open the BugIt folder, select the BugIt QA Agent, activate your license, then type Begin setup.','The user guide covers setup, everyday commands, customization, updates, backups, safety and troubleshooting. BugIt previews every report and files only after approval.','BugIt is licensed, not sold. Solo is one device at a time. Team allows up to 5 members, each with their own account. Software updates are included while the license is active.','Taskivator does not receive your bug reports, specs, glossary, screenshots, code, settings or tickets. Only a license check is used.']}}
};
function merge(a,b){const r=structuredClone(a);for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k]))r[k]=merge(r[k]||{},b[k]);else r[k]=b[k]}return r}
function add(code,obj){i18n[code]=merge(i18n.en,obj)}
add('ja',{name:'日本語',nav:{features:'機能',integrations:'連携',pricing:'価格',docs:'ドキュメント',faq:'FAQ'},cta:{early:'BugItを入手',demo:'デモを見る'},hero:{title:'ワークフローを<span>学習する</span>QAエージェント。',subtitle:'ラフなテストメモを、確認済みのきれいなバグチケットに変換し、数秒でトラッカーへ送ります。'},metrics:{saved:'1件あたり短縮',dupe:'重複チェック',setup:'セットアップ',private:'プライベート設計'},under:{features:'✓ 全機能込み',updates:'✓ ソフトウェア更新無料',private:'✓ プライベート設計'},demo:{eyebrow:'動作を見る',title:'1つのエージェント。さまざまなQA現場。',subtitle:'Web、モバイル、デスクトップ、SaaS、エンタープライズ、ゲームに対応。',core:'基本ワークフロー',saas:'SaaS / Webアプリ',game:'ゲームQA',mobile:'モバイルアプリ'},integrations:{eyebrow:'ツール連携',title:'今使っているツールにつながります。',lede:'11 のトラッカーすべてに組み込みの検証済みフィールドマッピングがあります。クラッシュ解析ツールなどのサービスはご自身の MCP サーバー経由で接続します。',builtin:'組み込み検証済みマッピング',mcp:'MCPサーバー経由',crash:'クラッシュとテスト',knowledge:'ナレッジとコラボ',note:'⌁ セットアップで対応ツールを有効化。1回接続すれば、どこでも使えます。Amazon S3 や Google Drive などのストレージは自動では設定されません。'},pricing:{soloTitle:'ソロライセンス',teamTitle:'チームライセンス',seats:'',perYear:' 買い切り',soloTerm:'1年間のSoloライセンス・自動更新なし',teamTerm:'1年間のTeamライセンス・自動更新なし',limited:'導入価格',soloRegular:'通常価格 $59.99',teamRegular:'通常価格 $249.99',soloDevice:'1デバイス（1ユーザー）',allFeatures:'全機能込み',updates:'有効期間中はソフトウェア更新無料',docs:'ドキュメントとガイド',support:'メールサポート',teamDevices:'最大5名、各メンバーが自分のアカウントを持つ',teamWorkflow:'共有QAワークフロー',teamConfig:'共有プロジェクト設定',teamSeverity:'一貫した重要度とカテゴリ',teamTools:'チーム設定ツール',priority:'優先サポート',teamCta:'BugIt Team を購入',soloCta:'BugIt Solo を購入'},trust:{privateTitle:'プライベート設計',private:'作業内容は、あなたが接続したAIとトラッカーにのみ送られ、Taskivator に送られることはありません。保存、学習利用、販売はしません。',telemetryTitle:'エージェントのテレメトリなし',telemetry:'BugIt ソフトウェアは製品テレメトリを送信しません。本ウェブサイトはパフォーマンスのために Cloudflare Web Analytics を使用します。',previewTitle:'登録前にプレビュー',preview:'すべてのチケットを確認し、FILE IT と入力して承認し、登録します。',backupsTitle:'ローカルバックアップ',backups:'設定と作業履歴はマシン上に残り、いつでもバックアップできます。',updatesTitle:'安全な更新',updates:'更新は暗号署名され、インストール前に検証されます。',vscodeTitle:'VS Codeで動作',vscode:'VS Codeネイティブ。別のアプリのインストールは不要です。このほかに Copilot（またはご自身のAIキー）と Python が必要です。'},faq:{title:'購入前の疑問をクリアに。',items:[['BugItは自動でバグを登録しますか？','いいえ。すべてのチケット、コメント、添付、通知はまずプレビューされます。取り消せない起票の前には、FILE IT と入力して承認します。チャットの文章だけでは登録されません。単なる「はい」では実行されません。ゼロ書き込みで練習するには dry run を使ってください。'],['組み込みの検証済みマッピングがあるトラッカーは？','11 のトラッカーすべてに組み込みの検証済みフィールドマッピングがあり、BugIt はお客様ご自身のアカウントで作成した資格情報でそのすべてに登録します: Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana、Trello。接続を保存する前に、BugIt がお客様ご自身の資格情報を選択した宛先に対して検証します。クラッシュ解析ツール、テスト管理などのサービスは、ご自身の MCP サーバー経由で接続し、アシスタントが読み取れます。'],['GitHub Copilotは必要ですか？','推奨で、最も簡単な使い方です。自分のOpenAIまたはAnthropicキーでスタンドアロン実行もできます。'],['Claude、Gemini、GPTは使えますか？','はい。GitHub Copilot内で利用可能なモデルを使えます。スタンドアロンではOpenAIまたはAnthropicキーに対応します。'],['Taskivatorは私の作業を見ますか？','いいえ。バグレポート、仕様、用語集、スクリーンショット、設定はTaskivatorへ送信されません。'],['Teamには何が含まれますか？','BugIt Team は現在ご利用いただけます。買い切りで、最大5名向けの1年間ライセンスです。共有ライセンスではなく、各メンバーが自分専用の BugIt アカウント、自分専用のサインイン、自分専用のデバイスアクティベーションを持ちます。チーム設定は共有され、ポータルで一元管理され、自動更新はありません。Solo プランは影響を受けず、同様にご利用いただけます。'],['登録せずに練習できますか？','はい。dry runを使うと、チケットやコメントを作成せずに完全なレポートを生成できます。 dry run はBugItに付属するヘルパーの書き込みを止め、エージェントにトラッカーへの書き込みを拒否するよう指示します。この拒否はプラットフォーム側のロックではなくBugItの指示に従うものなので、検証時は読み取り専用の認証情報を使ってください。'],['BugItをカスタマイズできますか？','はい。用語集、カテゴリ、プラットフォーム、ハウススタイル、トラッカー設定を調整できます。'],['スクリーンショットに対応していますか？','はい。BugItはスクリーンショットや録画、ログを入れるフォルダーをあなたのPC上に開き、トラッカー向けに準備して、承認後にアップロードします。チャットに貼り付けた画像は読み取れますが添付はできないため、BugItはフォルダーを使います。アップロードは11のトラッカーのうち8つで利用できます。'],['更新はどう動きますか？','BugItは設定をバックアップし、署名済み更新を検証し、セットアップを保持します。'],['ライセンス期限が切れたら？','ローカルファイルと設定は残ります。登録機能には有効なライセンスが必要です。'],['サポートはどう受けますか？','the in-app Support page へメールしてください。機密情報は送らないでください。']]},docs:{eyebrow:'ドキュメント',getting:'はじめに',gettingDesc:'数分でセットアップ。',user:'ユーザーガイド',userDesc:'機能とワークフローの完全ガイド。',license:'ライセンス契約',licenseDesc:'BugItの利用条件。',privacy:'プライバシーポリシー',privacyDesc:'データの収集、利用、保護について。',commerce:'特定商取引法に基づく表記',commerceDesc:'販売事業者・取引に関する表記。',faqDesc:'よくある質問への回答。',support:'サポート',supportDesc:'ヘルプを受け、サポートチケットを送信できます。'},docPages:{homeTitle:'ドキュメント',homeIntro:'BugItを安全にインストール、認証、カスタマイズ、利用するための情報です。',commerceTitle:'特定商取引法に基づく表記',commerceIntro:'特定商取引法（通信販売）に基づく、BugIt の販売事業者および取引に関する表記です。',refundTitle:'返金ポリシー',refundIntro:'BugIt ライセンスのご購入に関する返金ポリシーです。',gettingTitle:'はじめに',userTitle:'ユーザーガイド',licenseTitle:'ライセンス契約',privacyTitle:'プライバシーポリシー',faqTitle:'FAQ',supportTitle:'サポート',supportIntro:'設定やライセンスの相談は the in-app Support page へご連絡ください。',download:'PDFをダウンロード',before:'送信前に',beforeText:'機密コード、顧客データ、非公開チケット、シークレットは含めないでください。',sections:['VS CodeとGitHub Copilotをインストールし、BugItフォルダを開き、BugIt QA Agentを選択し、Activate と入力します（ブラウザで BugIt Portal が開きます）。その後 Begin setup と入力します。','ユーザーガイドでは、初期設定、日常コマンド、カスタマイズ、更新、バックアップ、安全性、トラブルシューティングを説明しています。','BugItは販売ではなくライセンス提供です。Soloは1デバイス、Teamは最大5名で、各メンバーが自分専用のアカウントを持ちます。有効期間中はソフトウェア更新が含まれます。','Taskivatorはバグレポート、仕様、用語集、スクリーンショット、コード、設定、チケットを受け取りません。匿名ライセンス確認のみを使用します。']}});
add('es',{name:'Español',nav:{features:'Funciones',integrations:'Integraciones',pricing:'Precios',docs:'Documentación',faq:'FAQ'},cta:{early:'Obtener BugIt',demo:'Ver demo'},hero:{title:'El agente QA que <span>aprende</span> tu flujo de trabajo.',subtitle:'Convierte notas de prueba en tickets limpios y revisados, listos para enviarse al tracker en segundos.'},metrics:{saved:'ahorrados por bug',dupe:'búsqueda de duplicados',setup:'configuración',private:'privado por diseño'},under:{features:'✓ Todas las funciones incluidas',updates:'✓ Actualizaciones de software gratis',private:'✓ Privado por diseño'},demo:{eyebrow:'VERLO EN ACCIÓN',title:'Un agente. Distintos mundos de QA.',subtitle:'Úsalo para web, móvil, escritorio, SaaS, flujos empresariales o juegos.',core:'Flujo principal',saas:'SaaS / App web',game:'QA de juegos',mobile:'App móvil'},integrations:{eyebrow:'FUNCIONA CON TUS HERRAMIENTAS',title:'Conecta las herramientas que ya usas.',lede:'Los once sistemas de seguimiento incluyen mapeo de campos integrado y probado, y BugIt archiva en todos ellos con una credencial que creas en tu propia cuenta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana y Trello. BugIt valida tu propia credencial y destino antes de guardar la conexión. Las herramientas de fallos, la gestión de pruebas y otros servicios se conectan mediante tu propio servidor MCP para que tu asistente pueda leerlos.',builtin:'MAPEO INTEGRADO Y PROBADO',mcp:'MEDIANTE TU SERVIDOR MCP',crash:'CRASH Y PRUEBAS',knowledge:'CONOCIMIENTO Y COLABORACIÓN',note:'⌁ Activa una herramienta compatible en la configuración. Conecta una vez y úsala en todas partes. Servicios de almacenamiento como Amazon S3 y Google Drive no se configuran automáticamente.'},pricing:{soloTitle:'LICENCIA INDIVIDUAL',teamTitle:'LICENCIA DE EQUIPO',seats:'',perYear:' pago único',soloTerm:'Licencia Solo de 1 año · no se renueva automáticamente',teamTerm:'Licencia Team de 1 año · no se renueva automáticamente',limited:'Precio de lanzamiento',soloRegular:'Precio normal $59.99',teamRegular:'Precio normal $249.99',soloDevice:'1 dispositivo (1 usuario)',allFeatures:'Todas las funciones incluidas',updates:'Actualizaciones de software gratis mientras esté activa',docs:'Documentación y guías',support:'Soporte por email',teamDevices:'Hasta 5 miembros, cada uno con su propia cuenta',teamWorkflow:'Flujo QA compartido',teamConfig:'Configuración de proyecto compartida',teamSeverity:'Severidades y categorías consistentes',teamTools:'Herramientas de configuración de equipo',priority:'Soporte prioritario',teamCta:'Obtener BugIt Team',soloCta:'Obtener BugIt Solo'},trust:{privateTitle:'Privado por diseño',private:'Tu trabajo va únicamente a la IA y al rastreador que conectes, nunca a Taskivator. No lo almacenamos, entrenamos ni vendemos.',telemetryTitle:'Sin telemetría del agente',telemetry:'El software BugIt no envía telemetría del producto. Este sitio web usa Cloudflare Web Analytics para el rendimiento.',previewTitle:'Vista previa antes de enviar',preview:'Revisa cada ticket y aprueba cada envío escribiendo FILE IT.',backupsTitle:'Copias locales',backups:'Tus ajustes y actividad permanecen en tu equipo. Copias fáciles cuando quieras.',updatesTitle:'Actualizaciones seguras',updates:'Las actualizaciones están firmadas criptográficamente y se verifican antes de instalarse.',vscodeTitle:'Funciona en VS Code',vscode:'Nativo de VS Code, sin otra app que instalar. También necesitas Copilot (o tu propia clave de IA) y Python.'},faq:{title:'Detalles de lanzamiento, sin sorpresas.',items:[['¿BugIt crea incidencias automáticamente?','No. Cada ticket, comentario, adjunto o notificación se muestra primero como vista previa. Antes de registrar un ticket irreversible, lo apruebas escribiendo FILE IT; el texto del chat por sí solo nunca registra nada. Un simple «sí» no basta. Use dry run para practicar sin ninguna escritura.'],['¿Qué trackers tienen mapeo integrado y probado?','Los once sistemas tienen mapeo de campos integrado y probado. Las herramientas de fallos y otros servicios se conectan mediante tu propio servidor MCP.'],['¿Necesito GitHub Copilot?','Se recomienda GitHub Copilot y es la opción más sencilla. BugIt también puede ejecutarse en modo standalone con tu propia clave de OpenAI o Anthropic.'],['¿Puedo usar Claude, Gemini o GPT?','Sí. Dentro de GitHub Copilot puedes usar los modelos disponibles en tu plan. El modo standalone admite tu propia clave de OpenAI o Anthropic.'],['¿Taskivator ve mi trabajo?','No. Tus reportes, especificaciones, glosario, capturas y ajustes nunca se envían a Taskivator.'],['¿Qué incluye Team?','El plan Team ya está disponible. Un pago único cubre una licencia de 1 año para hasta 5 miembros: cada miembro tiene su propia cuenta de BugIt, su propio inicio de sesión y su propia activación de dispositivo, en lugar de una licencia compartida. La configuración del equipo se comparte y se gestiona de forma centralizada en el Portal, y no se renueva automáticamente. El plan Solo no se ve afectado y también está disponible.'],['¿Puedo practicar sin enviar nada?','Sí. Usa dry run para generar un reporte completo sin crear tickets, comentarios ni notificaciones. Dry run impide que los helpers integrados de BugIt escriban y ordena al agente rechazar escrituras en el tracker; esa negativa sigue las instrucciones de BugIt en lugar de un bloqueo de plataforma, así que use credenciales de solo lectura al evaluar.'],['¿Puedo personalizar BugIt?','Sí. Puedes configurar glosario, categorías, plataformas, estilo del equipo y ajustes del tracker.'],['¿BugIt admite capturas de pantalla?','Sí. BugIt abre una carpeta en tu equipo para capturas, grabaciones y registros, los prepara para tu rastreador y los sube después de que los apruebes. Una imagen pegada en el chat se puede leer, pero nunca adjuntar, así que BugIt usa la carpeta. La subida funciona en ocho de los once rastreadores.'],['¿Cómo funcionan las actualizaciones?','BugIt respalda tus ajustes, verifica actualizaciones firmadas y conserva tu configuración.'],['¿Qué ocurre cuando vence mi licencia?','Conservas tus archivos y ajustes locales. Las funciones de envío requieren una licencia activa.'],['¿Cómo recibo soporte?','Escribe a the in-app Support page. No envíes información confidencial del proyecto.']]},docs:{eyebrow:'DOCUMENTACIÓN',getting:'Primeros pasos',gettingDesc:'Configura BugIt en minutos.',user:'Guía de usuario',userDesc:'Guía completa de funciones y flujos.',license:'Acuerdo de licencia',licenseDesc:'Términos de uso de BugIt.',privacy:'Política de privacidad',privacyDesc:'Cómo recopilamos, usamos y protegemos tus datos.',faqDesc:'Respuestas a preguntas comunes.',support:'Soporte',supportDesc:'Obtén ayuda y abre un ticket de soporte.'},docPages:{homeTitle:'Documentación',homeIntro:'Todo lo necesario para instalar, activar, personalizar y usar BugIt con seguridad.',gettingTitle:'Primeros pasos',userTitle:'Guía de usuario',licenseTitle:'Acuerdo de licencia',privacyTitle:'Política de privacidad',faqTitle:'FAQ',supportTitle:'Soporte',supportIntro:'¿Necesitas ayuda con la configuración o la licencia? Escribe a the in-app Support page.',download:'Descargar PDF',before:'Antes de escribir',beforeText:'No incluyas código fuente confidencial, datos de clientes, tickets privados ni secretos.',sections:['Instala VS Code y GitHub Copilot, abre la carpeta de BugIt, selecciona BugIt QA Agent, activa tu licencia y escribe Begin setup.','La guía cubre configuración, comandos diarios, personalización, actualizaciones, copias de seguridad, seguridad y solución de problemas.','BugIt se licencia, no se vende. Solo es un dispositivo a la vez. Team permite hasta 5 miembros, cada uno con su propia cuenta.','Taskivator no recibe tus reportes, especificaciones, glosario, capturas, código, ajustes ni tickets. Solo se usan comprobaciones anónimas de licencia.']}});
function makeLang(code,name,nav,cta,heroTitle,heroSub,priceLimited,soloReg,teamReg,teamCta,faqTitle,docsName){add(code,{name,nav:{features:nav[0],integrations:nav[1],pricing:nav[2],docs:nav[3],faq:nav[4]},cta:{early:cta[0],demo:cta[1]},hero:{title:heroTitle,subtitle:heroSub},pricing:{soloTitle:nav[5],teamTitle:nav[6],seats:nav[7],perYear:nav[8],limited:priceLimited,soloRegular:soloReg,teamRegular:teamReg,teamCta,soloDevice:nav[9],allFeatures:nav[10],updates:nav[11],docs:nav[12],support:nav[13],teamDevices:nav[14],teamWorkflow:nav[15],teamConfig:nav[16],teamSeverity:nav[17],teamTools:nav[18],priority:nav[19]},demo:{eyebrow:nav[20],title:nav[21],subtitle:nav[22],saas:'SaaS / Web App',game:nav[23],mobile:nav[24]},integrations:{eyebrow:nav[25],title:nav[26],lede:nav[27],builtin:nav[28],mcp:nav[29],crash:nav[30],knowledge:nav[31],note:nav[32]},faq:{title:faqTitle,items:docsName.faq},docs:{eyebrow:nav[3].toUpperCase(),getting:docsName.getting,user:docsName.user,license:docsName.license,privacy:docsName.privacy,faqDesc:docsName.faqDesc,support:docsName.support,gettingDesc:docsName.gettingDesc,userDesc:docsName.userDesc,licenseDesc:docsName.licenseDesc,privacyDesc:docsName.privacyDesc},docPages:{homeTitle:nav[3],homeIntro:docsName.homeIntro,gettingTitle:docsName.getting,userTitle:docsName.user,licenseTitle:docsName.license,privacyTitle:docsName.privacy,faqTitle:'FAQ',supportTitle:docsName.support,supportIntro:docsName.supportIntro,download:docsName.download,before:docsName.before,beforeText:docsName.beforeText,sections:docsName.sections}})}
const frFaq=[['BugIt crée-t-il des tickets automatiquement ?','Non. Chaque ticket, commentaire, pièce jointe ou notification est d’abord prévisualisé. Avant de créer un ticket irréversible, vous l’approuvez en tapant FILE IT ; le texte du chat seul ne crée jamais rien. Un simple « oui » ne suffit pas. Utilisez dry run pour vous entraîner sans aucune écriture.'],['Quels trackers ont un mapping intégré et testé ?','Les onze outils ont un mapping de champs intégré et testé. Les outils de plantage et les autres services passent par votre propre serveur MCP.'],['Ai-je besoin de GitHub Copilot ?','GitHub Copilot est recommandé et reste le plus simple. BugIt peut aussi fonctionner avec votre propre clé OpenAI ou Anthropic.'],['Puis-je utiliser Claude, Gemini ou GPT ?','Oui, via les modèles disponibles dans votre plan GitHub Copilot. Le mode autonome prend en charge OpenAI ou Anthropic.'],['Taskivator voit-il mon travail ?','Non. Vos rapports, spécifications, glossaire, captures et paramètres ne sont jamais envoyés à Taskivator.'],['Que contient Team ?','L’offre Team est disponible dès maintenant. Un paiement unique couvre une licence de 1 an pour jusqu’à 5 membres, et chaque membre dispose de son propre compte BugIt, de sa propre connexion et de sa propre activation d’appareil, au lieu d’une licence partagée. La configuration de l’équipe est partagée et gérée de façon centralisée dans le Portail, sans reconduction automatique. L’offre Solo n’est pas affectée et reste disponible.'],['Puis-je m’entraîner sans créer de ticket ?','Oui. Utilisez dry run pour générer un rapport complet sans créer de ticket, commentaire ou notification. Le dry run empêche les utilitaires intégrés de BugIt d’écrire et demande à l’agent de refuser les écritures dans le tracker ; ce refus suit les instructions de BugIt et non un verrou de la plateforme, utilisez donc des identifiants en lecture seule pour vos essais.'],['Puis-je personnaliser BugIt ?','Oui. Vous pouvez configurer le glossaire, les catégories, les plateformes, le style d’équipe et les paramètres du tracker.'],['BugIt accepte-t-il les captures d’écran ?','Oui. BugIt ouvre un dossier sur votre machine pour les captures, enregistrements et journaux, les prépare pour votre outil de suivi et les téléverse après votre approbation. Une image collée dans le chat peut être lue mais jamais jointe, donc BugIt passe par le dossier. Le téléversement fonctionne sur huit des onze outils.'],['Comment fonctionnent les mises à jour ?','BugIt sauvegarde vos paramètres, vérifie les mises à jour signées et préserve votre configuration.'],['Que se passe-t-il quand ma licence expire ?','Vos fichiers et paramètres locaux restent à vous. Les fonctions de dépôt nécessitent une licence active.'],['Comment obtenir de l’aide ?','Écrivez à the in-app Support page. N’envoyez pas d’informations confidentielles.']];
makeLang('fr','Français',['Fonctionnalités','Intégrations','Tarifs','Documentation','FAQ','LICENCE SOLO','LICENCE ÉQUIPE','5 SIÈGES','/an','1 appareil (1 utilisateur)','Toutes les fonctionnalités incluses','Mises à jour logicielles gratuites pendant la licence','Documentation et guides','Support par e-mail','En cours de refonte pour que chaque membre ait son propre compte','Workflow QA partagé','Configuration de projet partagée','Sévérités et catégories cohérentes','Outils de configuration d’équipe','Support prioritaire','VOIR EN ACTION','Un agent. Plusieurs mondes QA.','Pour le web, mobile, desktop, SaaS, entreprise ou jeux.','QA jeu','Workflow général','FONCTIONNE AVEC VOS OUTILS','Connectez les outils que vous utilisez déjà.','Les onze outils ont un mapping de champs intégré et testé. Les outils de plantage et les autres services passent par votre propre serveur MCP.','MAPPING INTÉGRÉ TESTÉ','VIA VOTRE SERVEUR MCP','CRASH & TEST','CONNAISSANCE & COLLAB','⌁ Activez un outil pris en charge pendant la configuration. Connectez une fois, utilisez partout. Les services de stockage comme Amazon S3 et Google Drive ne sont pas configurés automatiquement.'],['Obtenir BugIt','Voir la démo'],'L’agent QA qui <span>apprend</span> votre workflow.','Transformez vos notes de test en tickets propres, relus et prêts à être envoyés en quelques secondes.','Prix de lancement','Prix normal 59,99 $/an','Prix normal 249,99 $/an','Obtenir la licence équipe','Les détails du lancement, sans surprise.',{faq:frFaq,getting:'Bien démarrer',user:'Guide utilisateur',license:'Contrat de licence',privacy:'Politique de confidentialité',faqDesc:'Réponses aux questions fréquentes.',support:'Support',gettingDesc:'Configurez BugIt en quelques minutes.',userDesc:'Guide complet des fonctions et workflows.',licenseDesc:'Conditions d’utilisation de BugIt.',privacyDesc:'Comment vos données sont protégées.',supportDesc:'Obtenez de l’aide et ouvrez un ticket de support.',homeIntro:'Tout pour installer, activer, personnaliser et utiliser BugIt en sécurité.',supportIntro:'Besoin d’aide pour la configuration ou la licence ? Ouvrez un ticket de support depuis votre tableau de bord BugIt.',download:'Télécharger le PDF',before:'Avant d’ouvrir un ticket de support',beforeText:'N’incluez pas de code source confidentiel, données client, tickets privés ou secrets.',sections:['Installez VS Code et GitHub Copilot, ouvrez le dossier BugIt, sélectionnez BugIt QA Agent, activez votre licence et tapez Begin setup.','Le guide couvre la configuration, les commandes quotidiennes, la personnalisation, les mises à jour, les sauvegardes, la sécurité et le dépannage.','BugIt est concédé sous licence, non vendu. Solo couvre un appareil à la fois. Team autorise jusqu’à 5 membres, chacun avec son propre compte.','Taskivator ne reçoit pas vos rapports, spécifications, glossaire, captures, code, paramètres ou tickets. Seules les vérifications anonymes de licence sont utilisées.']});
const deFaq=[['Legt BugIt automatisch Bugs an?','Nein. Jedes Ticket, jeder Kommentar, jeder Anhang und jede Benachrichtigung wird zuerst als Vorschau angezeigt. Vor einer irreversiblen Einreichung bestätigen Sie durch die Eingabe von FILE IT; Chat-Text allein reicht nie zum Einreichen. Ein einfaches „Ja“ reicht nicht aus. Nutzen Sie dry run, um ohne jeden Schreibvorgang zu üben.'],['Welche Tracker haben integriertes getestetes Mapping?','Alle elf Tracker haben integriertes, getestetes Feldmapping. Crash-Tools und weitere Dienste laufen über Ihren eigenen MCP-Server.'],['Brauche ich GitHub Copilot?','GitHub Copilot wird empfohlen und ist am einfachsten. BugIt kann auch eigenständig mit Ihrem OpenAI- oder Anthropic-Schlüssel laufen.'],['Kann ich Claude, Gemini oder GPT verwenden?','Ja, über die Modelle in Ihrem GitHub-Copilot-Plan. Der Standalone-Modus unterstützt OpenAI oder Anthropic.'],['Sieht Taskivator meine Arbeit?','Nein. Ihre Berichte, Spezifikationen, Glossare, Screenshots und Einstellungen werden nie an Taskivator gesendet.'],['Was ist in Team enthalten?','Der Team-Tarif ist jetzt verfügbar. Eine Einmalzahlung deckt eine 1-Jahres-Lizenz für bis zu 5 Mitglieder ab, und jedes Mitglied erhält ein eigenes BugIt-Konto, eine eigene Anmeldung und eine eigene Geräteaktivierung statt einer gemeinsamen Lizenz. Die Team-Konfiguration wird gemeinsam genutzt und zentral im Portal verwaltet, ohne automatische Verlängerung. Der Solo-Tarif ist nicht betroffen und ebenfalls verfügbar.'],['Kann ich ohne Einreichen üben?','Ja. Mit dry run erzeugen Sie einen vollständigen Bericht ohne Tickets, Kommentare oder Benachrichtigungen. Dry run hindert die mitgelieferten BugIt-Helfer am Schreiben und weist den Agenten an, Tracker-Schreibzugriffe zu verweigern; diese Verweigerung folgt den Anweisungen von BugIt, nicht einer plattformseitigen Sperre. Verwenden Sie zum Testen daher schreibgeschützte Zugangsdaten.'],['Kann ich BugIt anpassen?','Ja. Glossar, Kategorien, Plattformen, Teamstil und Tracker-Einstellungen sind anpassbar.'],['Unterstützt BugIt Screenshots?','Ja. BugIt öffnet auf Ihrem Rechner einen Ordner für Screenshots, Aufzeichnungen und Protokolle, bereitet sie für Ihren Tracker auf und lädt sie nach Ihrer Freigabe hoch. Ein in den Chat eingefügtes Bild kann gelesen, aber nie angehängt werden, deshalb nutzt BugIt den Ordner. Der Upload funktioniert bei acht der elf Tracker.'],['Wie funktionieren Updates?','BugIt sichert Ihre Einstellungen, prüft signierte Updates und behält Ihre Konfiguration.'],['Was passiert, wenn meine Lizenz abläuft?','Ihre lokalen Dateien und Einstellungen bleiben erhalten. Einreichfunktionen benötigen eine aktive Lizenz.'],['Wie erhalte ich Support?','Schreiben Sie an the in-app Support page. Bitte senden Sie keine vertraulichen Projektdaten.']];
makeLang('de','Deutsch',['Funktionen','Integrationen','Preise','Dokumentation','FAQ','EINZELLIZENZ','TEAM-LIZENZ','5 PLÄTZE','/Jahr','1 Gerät (1 Benutzer)','Alle Funktionen enthalten','Kostenlose Software-Updates während der Laufzeit','Dokumentation & Anleitungen','E-Mail-Support','Wird überarbeitet, damit jedes Mitglied ein eigenes Konto erhält','Gemeinsamer QA-Workflow','Gemeinsame Projektkonfiguration','Konsistente Schweregrade & Kategorien','Team-Setup-Tools','Priorisierter Support','IN AKTION SEHEN','Ein Agent. Verschiedene QA-Welten.','Für Web, Mobile, Desktop, SaaS, Enterprise-Workflows oder Spiele.','Game QA','Allgemeiner Workflow','FUNKTIONIERT MIT IHREN TOOLS','Verbinden Sie die Tools, die Sie bereits nutzen.','Alle elf Tracker haben integriertes, getestetes Feldmapping. Crash-Tools und weitere Dienste laufen über Ihren eigenen MCP-Server.','INTEGRIERTES GETESTETES MAPPING','ÜBER IHREN MCP-SERVER','CRASH & TEST','WISSEN & ZUSAMMENARBEIT','⌁ Aktivieren Sie im Setup ein unterstütztes Tool. Einmal verbinden, überall nutzen. Speicherdienste wie Amazon S3 und Google Drive werden nicht automatisch eingerichtet.'],['BugIt holen','Demo ansehen'],'Der QA-Agent, der Ihren <span>Workflow lernt</span>.','Aus groben Testnotizen werden saubere, geprüfte Bug-Tickets, die in Sekunden an Ihren Tracker gehen.','Einführungspreis','Regulärer Preis 59,99 $/Jahr','Regulärer Preis 249,99 $/Jahr','Team-Lizenz erhalten','Launch-Details ohne Überraschungen.',{faq:deFaq,getting:'Erste Schritte',user:'Benutzerhandbuch',license:'Lizenzvertrag',privacy:'Datenschutzrichtlinie',faqDesc:'Antworten auf häufige Fragen.',support:'Support',gettingDesc:'BugIt in wenigen Minuten einrichten.',userDesc:'Vollständiger Leitfaden zu Funktionen und Workflows.',licenseDesc:'Nutzungsbedingungen für BugIt.',privacyDesc:'Wie wir Ihre Daten schützen.',supportDesc:'Hilfe erhalten und ein Support-Ticket öffnen.',homeIntro:'Alles, was Sie brauchen, um BugIt sicher zu installieren, zu aktivieren, anzupassen und zu nutzen.',supportIntro:'Hilfe zu Einrichtung oder Lizenz? Öffnen Sie über Ihr BugIt-Dashboard ein Support-Ticket.',download:'PDF herunterladen',before:'Vor dem Senden',beforeText:'Bitte keine vertraulichen Quellcodes, Kundendaten, privaten Tickets oder Secrets senden.',sections:['Installieren Sie VS Code und GitHub Copilot, öffnen Sie den BugIt-Ordner, wählen Sie BugIt QA Agent, aktivieren Sie Ihre Lizenz und tippen Sie Begin setup.','Das Handbuch behandelt Einrichtung, Alltagsbefehle, Anpassung, Updates, Backups, Sicherheit und Fehlerbehebung.','BugIt wird lizenziert, nicht verkauft. Solo gilt für ein Gerät gleichzeitig. Team erlaubt bis zu 5 Mitglieder, jeweils mit eigenem Konto.','Taskivator erhält keine Berichte, Spezifikationen, Glossare, Screenshots, Codes, Einstellungen oder Tickets. Es gibt nur Lizenzprüfungen.']});
// Compact but complete localizations for remaining languages
add('pt-br',merge(i18n.es,{name:'Português BR',nav:{features:'Recursos',integrations:'Integrações',pricing:'Preços',docs:'Documentação',faq:'FAQ'},cta:{early:'Obter BugIt',demo:'Ver demo'},hero:{title:'O agente QA que <span>aprende</span> seu fluxo de trabalho.',subtitle:'Transforme notas de teste em tickets limpos e revisados, enviados ao seu tracker em segundos.'},pricing:{soloTitle:'LICENÇA INDIVIDUAL',teamTitle:'LICENÇA DE EQUIPE',seats:'',perYear:' pagamento único',soloTerm:'Licença Solo de 1 ano · não renova automaticamente',teamTerm:'Licença Team de 1 ano · não renova automaticamente',limited:'Preço de lançamento',soloRegular:'Preço normal US$59,99',teamRegular:'Preço normal US$249,99',teamCta:'Obter o BugIt Team',soloCta:'Obter o BugIt Solo'},faq:{title:'Detalhes do lançamento, sem surpresas.',items:i18n.es.faq.items.map(([q,a])=>[q.replace('¿','').replace('?','?'),a])},docs:{getting:'Primeiros passos',user:'Guia do usuário',license:'Contrato de licença',privacy:'Política de privacidade',support:'Suporte'}}));
add('it',merge(i18n.es,{name:'Italiano',nav:{features:'Funzioni',integrations:'Integrazioni',pricing:'Prezzi',docs:'Documentazione',faq:'FAQ'},cta:{early:'Ottieni BugIt',demo:'Guarda demo'},hero:{title:'L’agente QA che <span>impara</span> il tuo workflow.',subtitle:'Trasforma note di test grezze in ticket puliti e revisionati, inviati al tracker in pochi secondi.'},pricing:{soloTitle:'LICENZA SINGOLA',teamTitle:'LICENZA TEAM',seats:'',perYear:' pagamento unico',soloTerm:'Licenza Solo di 1 anno · non si rinnova automaticamente',teamTerm:'Licenza Team di 1 anno · non si rinnova automaticamente',limited:'Prezzo di lancio',soloRegular:'Prezzo normale $59.99',teamRegular:'Prezzo normale $249.99',teamCta:'Ottieni BugIt Team',soloCta:'Ottieni BugIt Solo'},faq:{title:'Dettagli di lancio, senza sorprese.',items:i18n.es.faq.items.map(([q,a])=>[q.replace('¿','').replace('BugIt crea incidencias','BugIt crea ticket').replace('?','?'),a])},docs:{getting:'Introduzione',user:'Guida utente',license:'Contratto di licenza',privacy:'Informativa sulla privacy',support:'Supporto'}}));
add('ko',merge(i18n.ja,{name:'한국어',nav:{features:'기능',integrations:'연동',pricing:'가격',docs:'문서',faq:'FAQ'},cta:{early:'BugIt 받기',demo:'데모 보기'},hero:{title:'워크플로를 <span>학습하는</span> QA 에이전트.',subtitle:'간단한 테스트 메모를 검토된 깔끔한 버그 티켓으로 바꾸고 몇 초 안에 트래커로 보냅니다.'},pricing:{soloTitle:'솔로 라이선스',teamTitle:'팀 라이선스',seats:'',perYear:' 1회 결제',soloTerm:'1년 Solo 라이선스 · 자동 갱신 없음',teamTerm:'1년 Team 라이선스 · 자동 갱신 없음',limited:'출시 기념 가격',soloRegular:'정가 $59.99',teamRegular:'정가 $249.99',teamCta:'BugIt Team 구매',soloCta:'BugIt Solo 구매'},faq:{title:'구매 전 궁금한 점을 명확하게.',items:[['BugIt이 자동으로 버그를 등록하나요?','아니요. 모든 티켓, 댓글, 첨부, 알림은 먼저 미리 보기로 표시됩니다. 되돌릴 수 없는 티켓 등록 전에는 FILE IT을 입력해 승인해야 하며, 채팅 문구만으로는 등록되지 않습니다. 단순히 "예"만으로는 진행되지 않습니다.'],['내장 테스트 매핑이 있는 트래커는 무엇인가요?','열한 개 추적 시스템에는 모두 테스트된 필드 매핑이 내장되어 있으며, 각 시스템의 REST API를 통해 직접 티켓을 등록합니다. 티켓 등록에는 MCP를 사용하지 않습니다. 크래시 도구, 테스트 관리 및 기타 서비스는 사용자가 준비한 MCP 서버를 통해 연결됩니다.'],['GitHub Copilot이 필요한가요?','권장되며 가장 쉽습니다. 자체 OpenAI 또는 Anthropic 키로 독립 실행도 가능합니다.'],['Claude, Gemini 또는 GPT를 사용할 수 있나요?','예. GitHub Copilot에서 제공되는 모델을 사용할 수 있습니다. 독립 실행 모드는 OpenAI 또는 Anthropic 키를 지원합니다.'],['Taskivator가 제 작업을 볼 수 있나요?','아니요. 보고서, 사양, 용어집, 스크린샷, 설정은 Taskivator로 전송되지 않습니다.'],['Team에는 무엇이 포함되나요?','BugIt Team을 지금 이용할 수 있습니다. 1회 결제로 최대 5명을 위한 1년 라이선스를 제공합니다. 공유 라이선스 대신 각 구성원이 자신의 BugIt 계정, 자신의 로그인, 자신의 기기 활성화를 갖습니다. 팀 구성은 공유되며 포털에서 중앙 관리되고, 자동 갱신이 없습니다. Solo 요금제는 영향을 받지 않으며 함께 이용할 수 있습니다.'],['등록 없이 연습할 수 있나요?','예. dry run을 사용하면 티켓이나 댓글을 만들지 않고 전체 보고서를 생성할 수 있습니다. dry run은 BugIt에 포함된 도우미의 쓰기를 막고 에이전트에 트래커 쓰기를 거부하도록 지시합니다. 이 거부는 플랫폼 잠금이 아니라 BugIt의 지시를 따르므로, 평가할 때는 읽기 전용 자격 증명을 사용하세요.'],['BugIt을 사용자 지정할 수 있나요?','예. 용어집, 카테고리, 플랫폼, 팀 스타일, 트래커 설정을 구성할 수 있습니다.'],['스크린샷을 지원하나요?','예. BugIt이 스크린샷, 녹화, 로그를 넣을 폴더를 내 컴퓨터에 열어 주고, 트래커에 맞게 준비한 뒤 승인하면 업로드합니다. 채팅에 붙여 넣은 이미지는 읽을 수는 있지만 첨부할 수는 없어서 BugIt은 폴더를 사용합니다. 업로드는 11개 트래커 중 8개에서 지원됩니다.'],['업데이트는 어떻게 작동하나요?','BugIt은 설정을 백업하고 서명된 업데이트를 검증하며 기존 설정을 보존합니다.'],['라이선스가 만료되면 어떻게 되나요?','로컬 파일과 설정은 유지됩니다. 등록 기능은 활성 라이선스가 필요합니다.'],['지원은 어떻게 받나요?','BugIt 대시보드에서 지원 티켓을 등록하세요. 기밀 프로젝트 정보는 포함하지 않아도 됩니다.']]},docs:{getting:'시작하기',user:'사용자 가이드',license:'라이선스 계약',privacy:'개인정보 처리방침',support:'지원'}}));
add('zh',merge(i18n.ja,{name:'中文',nav:{features:'功能',integrations:'集成',pricing:'价格',docs:'文档',faq:'FAQ'},cta:{early:'获取 BugIt',demo:'观看演示'},hero:{title:'会学习你工作流的 <span>QA 代理</span>。',subtitle:'把粗略测试笔记变成清晰、已审阅的缺陷单，并在几秒内提交到你的跟踪器。'},pricing:{soloTitle:'单人许可',teamTitle:'团队许可',seats:'',perYear:' 一次性付款',soloTerm:'1 年期 Solo 授权 · 不自动续订',teamTerm:'1 年期 Team 许可证 · 不自动续订',limited:'尝鲜价',soloRegular:'常规价格 $59.99',teamRegular:'常规价格 $249.99',teamCta:'获取 BugIt Team',soloCta:'获取 BugIt Solo'},faq:{title:'购买前，先把问题说清楚。',items:[['BugIt 会自动提交缺陷吗？','不会。每个工单、评论、附件或通知都会先预览。执行不可撤销的工单提交前，需要输入 FILE IT 进行批准；仅靠聊天文字永远不会提交。仅输入"是"不会执行操作。'],['哪些跟踪器有内置测试映射？','全部十一个跟踪系统都内置经过测试的字段映射，BugIt 使用你在自己账户中创建的凭据向其中每一个提交：Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana 和 Trello。在保存连接之前，BugIt 会先验证你的凭据和目标位置。崩溃分析工具、测试管理等其他服务通过你自己的 MCP 服务器连接，供助手读取。'],['我需要 GitHub Copilot 吗？','推荐使用，也是最简单的方式。BugIt 也可以使用你自己的 OpenAI 或 Anthropic 密钥独立运行。'],['可以使用 Claude、Gemini 或 GPT 吗？','可以。在 GitHub Copilot 中使用你的计划可用的模型。独立模式支持 OpenAI 或 Anthropic。'],['Taskivator 会看到我的工作吗？','不会。缺陷报告、规格、术语表、截图和设置不会发送给 Taskivator。'],['Team 包含什么？','BugIt Team 现已推出。一次性付款即可获得适用于最多 5 名成员的 1 年期许可证：每位成员都拥有各自的 BugIt 账户、各自的登录和各自的设备激活，而不是共享一个许可证。团队配置为共享，并在门户中集中管理，且不自动续订。Solo 套餐不受影响，同样可用。'],['可以不提交就练习吗？','可以。使用 dry run 可生成完整报告，而不会创建工单、评论或通知。 dry run 会阻止 BugIt 内置的辅助工具写入，并指示代理拒绝对跟踪器的写入；这种拒绝遵循的是 BugIt 的指令而非平台级锁定，因此评估时请使用只读凭据。'],['可以自定义 BugIt 吗？','可以。你可以配置术语表、分类、平台、团队风格和跟踪器设置。'],['BugIt 支持截图吗？','支持。BugIt 会在你的电脑上打开一个文件夹，用于放置截图、录屏和日志，并按你的缺陷跟踪工具进行准备，在你批准后上传。粘贴到聊天中的图片可以被读取，但无法作为附件上传，因此 BugIt 使用文件夹。11 个跟踪工具中有 8 个支持上传。'],['更新如何工作？','BugIt 会备份设置、验证签名更新，并保留你的配置。'],['许可证到期会怎样？','你的本地文件和设置会保留。提交功能需要有效许可证。'],['如何获得支持？','先让 AI 助手诊断问题，然后运行 Check status 或 Check readiness。如果仍需帮助，请从 BugIt 仪表盘提交支持工单，无需包含机密项目信息。']]},docs:{getting:'快速开始',user:'用户指南',license:'许可协议',privacy:'隐私政策',support:'支持',supportDesc:'获取帮助并提交支持工单。'}}));
add('ru',merge(i18n.en,{name:'Русский',nav:{features:'Функции',integrations:'Интеграции',pricing:'Цены',docs:'Документация',faq:'FAQ'},cta:{early:'Получить BugIt',demo:'Смотреть демо'},hero:{title:'QA-агент, который <span>изучает</span> ваш рабочий процесс.',subtitle:'Превращает черновые тестовые заметки в аккуратные проверенные баг-тикеты за секунды.'},pricing:{soloTitle:'ЛИЧНАЯ ЛИЦЕНЗИЯ',teamTitle:'КОМАНДНАЯ ЛИЦЕНЗИЯ',seats:'',perYear:' разовый платёж',soloTerm:'Лицензия Solo на 1 год · без автопродления',teamTerm:'Лицензия Team на 1 год · без автопродления',limited:'Стартовая цена',soloRegular:'Обычная цена $59.99',teamRegular:'Обычная цена $249.99',soloDevice:'1 устройство (1 пользователь)',allFeatures:'Все функции включены',updates:'Бесплатные обновления программы при активной лицензии',docs:'Документация и руководства',support:'Поддержка по email',teamDevices:'До 5 участников, у каждого свой аккаунт',teamWorkflow:'Общий QA-процесс',teamConfig:'Общая конфигурация проекта',teamSeverity:'Единые уровни важности и категории',teamTools:'Инструменты настройки команды',priority:'Приоритетная поддержка',teamCta:'Получить BugIt Team',soloCta:'Получить BugIt Solo'},integrations:{eyebrow:'РАБОТАЕТ С ВАШИМИ ИНСТРУМЕНТАМИ',title:'Подключите инструменты, которыми уже пользуетесь.',lede:'Все одиннадцать трекеров имеют встроенное проверенное сопоставление полей, и BugIt пишет в каждый из них учётными данными, которые вы создаёте в собственном аккаунте: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana и Trello. BugIt проверяет ваши собственные учётные данные на выбранном вами назначении, прежде чем сохранить подключение. Инструменты для сбоев, управление тестами и прочие сервисы подключаются через ваш MCP-сервер, чтобы ассистент мог их читать.',builtin:'ВСТРОЕННОЕ ПРОВЕРЕННОЕ СОПОСТАВЛЕНИЕ',mcp:'ЧЕРЕЗ ВАШ MCP-СЕРВЕР',crash:'СБОИ И ТЕСТЫ',knowledge:'ЗНАНИЯ И СОВМЕСТНАЯ РАБОТА',note:'⌁ Включите поддерживаемый инструмент в настройке. Подключите один раз и используйте везде. Хранилища вроде Amazon S3 и Google Drive не настраиваются автоматически.'},faq:{title:'Детали запуска без сюрпризов.',items:[['BugIt отправляет баги автоматически?','Нет. Каждый тикет, комментарий, вложение и уведомление сначала показывается для предпросмотра. Перед необратимым созданием тикета вы подтверждаете его вводом FILE IT; один только текст в чате никогда ничего не создаёт. Обычного «да» недостаточно. Используйте dry run, чтобы тренироваться без записи.'],['Какие трекеры имеют встроенное проверенное сопоставление?','Все одиннадцать трекеров имеют встроенное проверенное сопоставление полей, и BugIt пишет в каждый из них учётными данными, которые вы создаёте в собственном аккаунте: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana и Trello. BugIt проверяет ваши собственные учётные данные на выбранном вами назначении, прежде чем сохранить подключение. Инструменты для сбоев, управление тестами и прочие сервисы подключаются через ваш MCP-сервер, чтобы ассистент мог их читать.'],['Нужен ли GitHub Copilot?','GitHub Copilot рекомендуется и является самым простым вариантом. BugIt также работает с расширением Claude в VS Code, с другим ассистентом или в обычном терминале: создание тикета выполняется командой, поэтому везде работает одинаково.'],['Можно ли использовать Claude, Gemini или GPT?','Да, через модели, доступные в вашем плане GitHub Copilot. Автономный режим поддерживает OpenAI или Anthropic.'],['Taskivator видит мою работу?','Нет. Отчёты, спецификации, глоссарий, скриншоты и настройки никогда не отправляются в Taskivator.'],['Что входит в Team?','Тариф Team уже доступен. Разовый платёж включает лицензию на 1 год для команды до 5 участников, у каждого участника собственный аккаунт BugIt, собственный вход и собственная активация устройства вместо общей лицензии. Конфигурация команды общая и управляется централизованно в Портале, без автопродления. Тариф Solo не затронут и также доступен.'],['Можно тренироваться без отправки?','Да. Используйте dry run, чтобы создать полный отчёт без тикетов, комментариев или уведомлений. Dry run не даёт встроенным помощникам BugIt выполнять запись и указывает агенту отклонять запись в трекер; этот отказ следует инструкциям BugIt, а не блокировке платформы, поэтому при проверке используйте учётные данные только для чтения.'],['Можно настроить BugIt под себя?','Да. Можно настроить глоссарий, категории, платформы, стиль команды и параметры трекера.'],['Поддерживает ли BugIt скриншоты?','Да. BugIt открывает на вашем компьютере папку для скриншотов, записей экрана и логов, готовит их для вашего трекера и загружает после вашего подтверждения. Изображение, вставленное в чат, можно прочитать, но нельзя приложить, поэтому BugIt использует папку. Загрузка работает в восьми трекерах из одиннадцати.'],['Как работают обновления?','BugIt делает резервную копию настроек, проверяет подписанные обновления и сохраняет вашу конфигурацию.'],['Что будет после истечения лицензии?','Ваши локальные файлы и настройки сохранятся. Для отправки тикетов нужна активная лицензия.'],['Как получить поддержку?','Сначала попросите AI-ассистента диагностировать проблему, затем выполните Check status или Check readiness. Если решить не удалось, создайте обращение в поддержку в личном кабинете BugIt. Конфиденциальные данные проекта указывать не нужно.']]},docs:{eyebrow:'ДОКУМЕНТАЦИЯ',getting:'Начало работы',gettingDesc:'Настройте BugIt за несколько минут.',user:'Руководство пользователя',userDesc:'Полное руководство по функциям и процессам.',license:'Лицензионное соглашение',licenseDesc:'Условия использования BugIt.',privacy:'Политика конфиденциальности',privacyDesc:'Как мы защищаем ваши данные.',faqDesc:'Ответы на частые вопросы.',support:'Поддержка',supportDesc:'Получите помощь и создайте обращение в поддержку.'}}));

add('pt-br',{name:'Português BR',nav:{features:'Recursos',integrations:'Integrações',pricing:'Preços',docs:'Documentação',faq:'FAQ'},cta:{early:'Obter BugIt',demo:'Ver demo'},hero:{title:'O agente QA que <span>aprende</span> seu fluxo de trabalho.',subtitle:'Transforme notas de teste em tickets limpos e revisados, enviados ao seu tracker em segundos.'},metrics:{saved:'economizados por bug',dupe:'verificação de duplicatas',setup:'configuração',private:'privado por design'},under:{features:'✓ Todos os recursos incluídos',updates:'✓ Atualizações de software gratuitas',private:'✓ Privado por design'},demo:{eyebrow:'VER EM AÇÃO',title:'Um agente. Diferentes mundos de QA.',subtitle:'Use para web, mobile, desktop, SaaS, fluxos corporativos ou jogos.',core:'Fluxo principal',saas:'SaaS / App web',game:'QA de jogos',mobile:'App mobile'},integrations:{eyebrow:'FUNCIONA COM SUAS FERRAMENTAS',title:'Conecte as ferramentas que você já usa.',lede:'Todos os onze rastreadores incluem mapeamento de campos integrado e testado, e o BugIt registra em cada um deles com uma credencial que você cria na sua própria conta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. O BugIt valida sua própria credencial e destino antes de salvar a conexão. Ferramentas de travamento, gestão de testes e outros serviços se conectam pelo seu próprio servidor MCP para que seu assistente possa lê-los.',builtin:'MAPEAMENTO INTEGRADO E TESTADO',mcp:'PELO SEU SERVIDOR MCP',crash:'CRASH E TESTE',knowledge:'CONHECIMENTO E COLABORAÇÃO',note:'⌁ Ative uma ferramenta compatível na configuração. Conecte uma vez e use em todos os lugares. Serviços de armazenamento como Amazon S3 e Google Drive não são configurados automaticamente.'},pricing:{soloTitle:'LICENÇA INDIVIDUAL',teamTitle:'LICENÇA DE EQUIPE',seats:'',perYear:' pagamento único',soloTerm:'Licença Solo de 1 ano · não renova automaticamente',teamTerm:'Licença Team de 1 ano · não renova automaticamente',limited:'Preço de lançamento',soloRegular:'Preço normal US$59,99',teamRegular:'Preço normal US$249,99',soloDevice:'1 dispositivo (1 usuário)',allFeatures:'Todos os recursos incluídos',updates:'Atualizações de software gratuitas enquanto ativa',docs:'Documentação e guias',support:'Suporte por email',teamDevices:'Até 5 membros, cada um com sua própria conta',teamWorkflow:'Fluxo QA compartilhado',teamConfig:'Configuração de projeto compartilhada',teamSeverity:'Severidades e categorias consistentes',teamTools:'Ferramentas de configuração de equipe',priority:'Suporte prioritário',teamCta:'Obter o BugIt Team',soloCta:'Obter o BugIt Solo'},trust:{privateTitle:'Privado por design',private:'Seu trabalho vai apenas para a IA e o rastreador que você conecta, nunca para a Taskivator. Nós nunca armazenamos, treinamos ou vendemos seus dados.',telemetryTitle:'Sem telemetria do agente',telemetry:'O software BugIt não envia telemetria do produto. Este site usa o Cloudflare Web Analytics para desempenho.',previewTitle:'Prévia antes de enviar',preview:'Você revisa cada ticket e aprova cada envio digitando FILE IT.',backupsTitle:'Backups locais',backups:'Suas configurações e atividades ficam na sua máquina. Backups fáceis a qualquer momento.',updatesTitle:'Atualizações seguras',updates:'As atualizações são assinadas criptograficamente e verificadas antes da instalação.',vscodeTitle:'Roda no VS Code',vscode:'Nativo do VS Code, sem app separado para instalar. Você também precisa do Copilot (ou da sua própria chave de IA) e do Python.'},faq:{title:'Detalhes do lançamento, sem surpresas.',items:[['O BugIt cria bugs automaticamente?','Não. Cada ticket, comentário, anexo ou notificação é visualizado primeiro. Antes de registrar um ticket irreversível, você aprova digitando FILE IT; o texto do chat sozinho nunca registra nada. Um simples "sim" não basta.'],['Quais trackers têm mapeamento integrado e testado?','Todos os onze rastreadores têm mapeamento de campos integrado e testado. Ferramentas de travamento e outros serviços se conectam pelo seu próprio servidor MCP.'],['Preciso do GitHub Copilot?','O GitHub Copilot é recomendado e é o caminho mais fácil. O BugIt também funciona com a extensão do Claude no VS Code, com outro assistente ou em um terminal comum: registrar é um comando, então funciona igual em todos.'],['Posso usar Claude, Gemini ou GPT?','Sim. Dentro do GitHub Copilot, use os modelos disponíveis no seu plano. O modo standalone suporta OpenAI ou Anthropic.'],['A Taskivator vê meu trabalho?','Não. Seus relatórios, specs, glossário, capturas e configurações nunca são enviados para a Taskivator.'],['O que está incluído no Team?','O plano Team já está disponível. Um pagamento único cobre uma licença de 1 ano para até 5 membros, e cada membro tem sua própria conta BugIt, seu próprio login e sua própria ativação de dispositivo, em vez de uma licença compartilhada. A configuração da equipe é compartilhada e gerenciada de forma centralizada no Portal, e não renova automaticamente. O plano Solo não é afetado e também está disponível.'],['Posso praticar sem enviar?','Sim. Use dry run para gerar um relatório completo sem criar tickets, comentários ou notificações. Dry run impede que os helpers integrados do BugIt escrevam e instrui o agente a recusar escritas no tracker; essa recusa segue as instruções do BugIt, não um bloqueio de plataforma, então use credenciais somente leitura ao avaliar.'],['Posso personalizar o BugIt?','Sim. Você pode configurar glossário, categorias, plataformas, estilo da equipe e configurações do tracker.'],['O BugIt suporta capturas de tela?','Sim. O BugIt abre uma pasta no seu computador para capturas, gravações e logs, prepara os arquivos para o seu rastreador e os envia depois que você aprova. Uma imagem colada no chat pode ser lida, mas nunca anexada, então o BugIt usa a pasta. O envio funciona em oito dos onze rastreadores.'],['Como funcionam as atualizações?','O BugIt faz backup das configurações, verifica atualizações assinadas e preserva sua configuração.'],['O que acontece quando minha licença expira?','Seus arquivos e configurações locais permanecem. Recursos de envio exigem uma licença ativa.'],['Como recebo suporte?','Envie email para the in-app Support page. Não envie informações confidenciais do projeto.']]},docs:{eyebrow:'DOCUMENTAÇÃO',getting:'Primeiros passos',gettingDesc:'Configure o BugIt em minutos.',user:'Guia do usuário',userDesc:'Guia completo de recursos e fluxos.',license:'Contrato de licença',licenseDesc:'Termos de uso do BugIt.',privacy:'Política de privacidade',privacyDesc:'Como coletamos, usamos e protegemos seus dados.',supportDesc:'Receba ajuda e abra um chamado de suporte.',faqDesc:'Respostas para perguntas comuns.',support:'Suporte'},docPages:{homeTitle:'Documentação',homeIntro:'Tudo que você precisa para instalar, ativar, personalizar e usar o BugIt com segurança.',gettingTitle:'Primeiros passos',userTitle:'Guia do usuário',licenseTitle:'Contrato de licença',privacyTitle:'Política de privacidade',faqTitle:'FAQ',supportTitle:'Suporte',supportIntro:'Precisa de ajuda com configuração ou licença? Envie email para the in-app Support page.',download:'Baixar PDF',before:'Antes de enviar',beforeText:'Não inclua código-fonte confidencial, dados de clientes, tickets privados ou segredos.',sections:['Instale o VS Code e o GitHub Copilot, abra a pasta do BugIt, selecione BugIt QA Agent, ative sua licença e digite Begin setup.','O guia cobre configuração, comandos diários, personalização, atualizações, backups, segurança e solução de problemas. O BugIt mostra uma prévia de cada relatório e só envia após aprovação.','O BugIt é licenciado, não vendido. Solo é um dispositivo por vez. Team permite até 5 membros, cada um com sua própria conta. As atualizações de software estão incluídas enquanto a licença estiver ativa.','A Taskivator não recebe seus relatórios, specs, glossário, capturas, código, configurações ou tickets. Apenas verificações anônimas de licença são usadas.']}});
add('it',{name:'Italiano',nav:{features:'Funzioni',integrations:'Integrazioni',pricing:'Prezzi',docs:'Documentazione',faq:'FAQ'},cta:{early:'Ottieni BugIt',demo:'Guarda demo'},hero:{title:'L’agente QA che <span>impara</span> il tuo workflow.',subtitle:'Trasforma note di test grezze in ticket puliti e revisionati, inviati al tracker in pochi secondi.'},metrics:{saved:'risparmiati per bug',dupe:'controllo duplicati',setup:'configurazione',private:'privato per design'},under:{features:'✓ Tutte le funzioni incluse',updates:'✓ Aggiornamenti software gratuiti',private:'✓ Privato per design'},pricing:{soloTitle:'LICENZA SINGOLA',teamTitle:'LICENZA TEAM',seats:'',perYear:' pagamento unico',soloTerm:'Licenza Solo di 1 anno · non si rinnova automaticamente',teamTerm:'Licenza Team di 1 anno · non si rinnova automaticamente',limited:'Prezzo di lancio',soloRegular:'Prezzo normale $59.99',teamRegular:'Prezzo normale $249.99',soloDevice:'1 dispositivo (1 utente)',allFeatures:'Tutte le funzioni incluse',updates:'Aggiornamenti software gratuiti durante la licenza',docs:'Documentazione e guide',support:'Supporto via email',teamDevices:'Fino a 5 membri, ciascuno con il proprio account',teamWorkflow:'Workflow QA condiviso',teamConfig:'Configurazione progetto condivisa',teamSeverity:'Severità e categorie coerenti',teamTools:'Strumenti di configurazione team',priority:'Supporto prioritario',teamCta:'Ottieni BugIt Team',soloCta:'Ottieni BugIt Solo'},faq:{title:'Dettagli di lancio, senza sorprese.',items:[['BugIt crea bug automaticamente?','No. Ogni ticket, commento, allegato o notifica viene prima mostrato in anteprima. Prima di creare un ticket irreversibile, lo approvi digitando FILE IT; il solo testo della chat non crea mai nulla. Un semplice «sì» non basta. Usi dry run per esercitarsi senza alcuna scrittura.'],['Quali tracker hanno mapping integrato e testato?','Tutti e undici i tracker hanno mapping dei campi integrato e testato. Gli strumenti di crash e gli altri servizi si collegano tramite il tuo server MCP.'],['Mi serve GitHub Copilot?','GitHub Copilot è consigliato ed è il modo più semplice. BugIt funziona anche con l’estensione Claude in VS Code, con un altro assistente o in un semplice terminale: la creazione è un comando, quindi funziona allo stesso modo ovunque.'],['Posso usare Claude, Gemini o GPT?','Sì. In GitHub Copilot puoi usare i modelli disponibili nel tuo piano. La modalità standalone supporta OpenAI o Anthropic.'],['Taskivator vede il mio lavoro?','No. Report, specifiche, glossario, screenshot e impostazioni non vengono mai inviati a Taskivator.'],['Cosa include Team?','Il piano Team è disponibile ora. Un pagamento unico copre una licenza di 1 anno per un massimo di 5 membri: ogni membro ha il proprio account BugIt, il proprio login e la propria attivazione del dispositivo, invece di una licenza condivisa. La configurazione del team è condivisa e gestita centralmente nel Portale e non si rinnova automaticamente. Il piano Solo non è interessato ed è disponibile anch’esso.'],['Posso esercitarmi senza inviare?','Sì. Usa dry run per generare un report completo senza creare ticket, commenti o notifiche. Dry run impedisce ai helper integrati di BugIt di scrivere e dice all’agente di rifiutare le scritture sul tracker; quel rifiuto segue le istruzioni di BugIt, non un blocco della piattaforma, quindi usa credenziali di sola lettura durante la valutazione.'],['Posso personalizzare BugIt?','Sì. Puoi configurare glossario, categorie, piattaforme, stile del team e impostazioni del tracker.'],['BugIt supporta gli screenshot?','Sì. BugIt apre una cartella sul tuo computer per screenshot, registrazioni e log, li prepara per il tuo tracker e li carica dopo la tua approvazione. Un’immagine incollata nella chat può essere letta ma mai allegata, quindi BugIt usa la cartella. Il caricamento funziona su otto degli undici tracker.'],['Come funzionano gli aggiornamenti?','BugIt esegue il backup delle impostazioni, verifica gli aggiornamenti firmati e conserva la configurazione.'],['Cosa succede quando la licenza scade?','I file e le impostazioni locali restano disponibili. Le funzioni di invio richiedono una licenza attiva.'],['Come ricevo supporto?','Scrivi a the in-app Support page. Non inviare informazioni riservate del progetto.']]},docs:{eyebrow:'DOCUMENTAZIONE',getting:'Introduzione',gettingDesc:'Configura BugIt in pochi minuti.',user:'Guida utente',userDesc:'Guida completa a funzioni e workflow.',license:'Contratto di licenza',licenseDesc:'Termini per usare BugIt.',privacy:'Informativa sulla privacy',privacyDesc:'Come raccogliamo, usiamo e proteggiamo i dati.',supportDesc:'Ottieni aiuto e apri un ticket di supporto.',faqDesc:'Risposte alle domande comuni.',support:'Supporto'},docPages:{homeTitle:'Documentazione',homeIntro:'Tutto ciò che serve per installare, attivare, personalizzare e usare BugIt in sicurezza.',gettingTitle:'Introduzione',userTitle:'Guida utente',licenseTitle:'Contratto di licenza',privacyTitle:'Informativa sulla privacy',faqTitle:'FAQ',supportTitle:'Supporto',supportIntro:'Serve aiuto con configurazione o licenza? Scrivi a the in-app Support page.',download:'Scarica PDF',before:'Prima di scrivere',beforeText:'Non includere codice sorgente riservato, dati clienti, ticket privati o segreti.',sections:['Installa VS Code e GitHub Copilot, apri la cartella BugIt, seleziona BugIt QA Agent, attiva la licenza e digita Begin setup.','La guida copre configurazione, comandi quotidiani, personalizzazione, aggiornamenti, backup, sicurezza e risoluzione problemi.','BugIt è concesso in licenza, non venduto. Solo usa un dispositivo alla volta. Team consente fino a 5 membri, ciascuno con il proprio account.','Taskivator non riceve report, specifiche, glossario, screenshot, codice, impostazioni o ticket. Vengono usati solo controlli anonimi della licenza.']}});


const officialLogos={
  jira:['Jira','jira'],
  azuredevops:['Azure DevOps','azuredevops'],
  github:['GitHub','github'],
  gitlab:['GitLab','gitlab'],
  linear:['Linear','linear'],
  shortcut:['Shortcut','shortcut'],
  youtrack:['YouTrack','jetbrains'],
  bugzilla:['Bugzilla','bugzilla'],
  clickup:['ClickUp','clickup'],
  asana:['Asana','asana'],
  trello:['Trello','trello'],
  sentry:['Sentry','sentry'],
  crashlytics:['Crashlytics','firebase'],
  bugsnag:['BugSnag','bugsnag'],
  testrail:['TestRail','testrail'],
  xray:['Xray','xray'],
  confluence:['Confluence','confluence'],
  notion:['Notion','notion'],
  slack:['Slack','slack'],
  teams:['Teams','microsoftteams'],
  googledrive:['Google Drive','googledrive'],
  amazons3:['Amazon S3','amazons3']
};
const logoAssets={
  jira:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0052CC" d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"/></svg>`,
  azuredevops:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#0078D4"/><path fill="#fff" d="M6 10.5 18.5 6v20L6 21.5l8-1.3V11.8L6 10.5Zm14.3-3.9 5.7 2.8v13.2l-5.7 2.8V6.6Z"/></svg>`,
  github:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EDE9F6" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  gitlab:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FC6D26" d="m23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3362.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8633 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4619-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0094-7.003z"/></svg>`,
  linear:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#5E6AD2" d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z"/></svg>`,
  shortcut:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#58B1E4" d="M24 6a6 6 0 0 0-6-6H6a5.975 5.975 0 0 0-4.242 1.758 5.998 5.998 0 0 0 0 8.484l2.137 2.137A6.007 6.007 0 0 0 0 18a6 6 0 0 0 6 6h12a5.975 5.975 0 0 0 4.242-1.758 5.998 5.998 0 0 0 0-8.484l-2.137-2.137A6.002 6.002 0 0 0 24 6zM3.404 20.598c-.694-.694-1.075-1.615-1.075-2.596s.38-1.903 1.075-2.595a3.65 3.65 0 0 1 2.443-1.074l7.34 7.34H6a3.664 3.664 0 0 1-2.596-1.075zm17.192-5.194C21.29 16.1 21.67 17.02 21.67 18s-.38 1.904-1.075 2.596A3.644 3.644 0 0 1 18 21.67a3.64 3.64 0 0 1-2.596-1.075l-12-11.998C2.71 7.904 2.33 6.983 2.33 6.002s.38-1.903 1.075-2.595C4.1 2.712 5.02 2.33 6 2.33s1.904.381 2.596 1.076l12 11.997zm0-6.806a3.65 3.65 0 0 1-2.443 1.073l-7.34-7.342H18a3.64 3.64 0 0 1 2.596 1.075C21.29 4.1 21.67 5.02 21.67 6s-.38 1.904-1.075 2.598z"/></svg>`,
  youtrack:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="ytg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#FF2D87"/><stop offset="1" stop-color="#654DFF"/></linearGradient></defs><rect x="5" y="5" width="22" height="22" rx="4" fill="url(#ytg)"/><rect x="9" y="9" width="14" height="14" fill="#06040d"/><path fill="#fff" d="M11 12h5v2h-3v2h3v2h-3v2h-2v-8Zm7 0h3v8h-2v-6h-1v-2Z"/></svg>`,
  bugzilla:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#8B4AAF"/><path fill="#F7C46B" d="M13 11c2-4 7-4 10-1 3 4 1 11-5 13-6 1-10-4-8-9 .5-1.2 1.5-2.3 3-3Z"/><circle cx="17" cy="10" r="3.4" fill="#fff"/><circle cx="18" cy="9" r="1.5" fill="#111"/><path stroke="#111" stroke-linecap="round" stroke-width="1.5" d="M13 22c-1-1-1-2 0-3M16 7c0-3-1-5-3-7M20 8c2-4 5-5 8-4"/></svg>`,
  clickup:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#7B68EE" d="M2 18.439l3.69-2.828c1.961 2.56 4.044 3.739 6.363 3.739 2.307 0 4.33-1.166 6.203-3.704L22 18.405C19.298 22.065 15.941 24 12.053 24 8.178 24 4.788 22.078 2 18.439zM12.04 6.15l-6.568 5.66-3.036-3.52L12.055 0l9.543 8.296-3.05 3.509z"/></svg>`,
  asana:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F06A6A" d="M18.78 12.653c-2.882 0-5.22 2.336-5.22 5.22s2.338 5.22 5.22 5.22 5.22-2.34 5.22-5.22-2.336-5.22-5.22-5.22zm-13.56 0c-2.88 0-5.22 2.337-5.22 5.22s2.338 5.22 5.22 5.22 5.22-2.338 5.22-5.22-2.336-5.22-5.22-5.22zm12-6.525c0 2.883-2.337 5.22-5.22 5.22-2.882 0-5.22-2.337-5.22-5.22 0-2.88 2.338-5.22 5.22-5.22 2.883 0 5.22 2.34 5.22 5.22z"/></svg>`,
  trello:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0052CC" d="M21.147 0H2.853A2.86 2.86 0 000 2.853v18.294A2.86 2.86 0 002.853 24h18.294A2.86 2.86 0 0024 21.147V2.853A2.86 2.86 0 0021.147 0zM10.34 17.287a.953.953 0 01-.953.953h-4a.954.954 0 01-.954-.953V5.38a.953.953 0 01.954-.953h4a.954.954 0 01.953.953zm9.233-5.467a.944.944 0 01-.953.947h-4a.947.947 0 01-.953-.947V5.38a.953.953 0 01.953-.953h4a.954.954 0 01.953.953z"/></svg>`,
  sentry:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EDE9F6" d="M13.91 2.505c-.873-1.448-2.972-1.448-3.844 0L6.904 7.92a15.478 15.478 0 0 1 8.53 12.811h-2.221A13.301 13.301 0 0 0 5.784 9.814l-2.926 5.06a7.65 7.65 0 0 1 4.435 5.848H2.194a.365.365 0 0 1-.298-.534l1.413-2.402a5.16 5.16 0 0 0-1.614-.913L.296 19.275a2.182 2.182 0 0 0 .812 2.999 2.24 2.24 0 0 0 1.086.288h6.983a9.322 9.322 0 0 0-3.845-8.318l1.11-1.922a11.47 11.47 0 0 1 4.95 10.24h5.915a17.242 17.242 0 0 0-7.885-15.28l2.244-3.845a.37.37 0 0 1 .504-.13c.255.14 9.75 16.708 9.928 16.9a.365.365 0 0 1-.327.543h-2.287c.029.612.029 1.223 0 1.831h2.297a2.206 2.206 0 0 0 1.922-3.31z"/></svg>`,
  crashlytics:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#DD2C00" d="M19.455 8.369c-.538-.748-1.778-2.285-3.681-4.569-.826-.991-1.535-1.832-1.884-2.245a146 146 0 0 0-.488-.576l-.207-.245-.113-.133-.022-.032-.01-.005L12.57 0l-.609.488c-1.555 1.246-2.828 2.851-3.681 4.64-.523 1.064-.864 2.105-1.043 3.176-.047.241-.088.489-.121.738-.209-.017-.421-.028-.632-.033-.018-.001-.035-.002-.059-.003a7.46 7.46 0 0 0-2.28.274l-.317.089-.163.286c-.765 1.342-1.198 2.869-1.252 4.416-.07 2.01.477 3.954 1.583 5.625 1.082 1.633 2.61 2.882 4.42 3.611l.236.095.071.025.003-.001a9.59 9.59 0 0 0 2.941.568q.171.006.342.006c1.273 0 2.513-.249 3.69-.742l.008.004.313-.145a9.63 9.63 0 0 0 3.927-3.335c1.01-1.49 1.577-3.234 1.641-5.042.075-2.161-.643-4.304-2.133-6.371m-7.083 6.695c.328 1.244.264 2.44-.191 3.558-1.135-1.12-1.967-2.352-2.475-3.665-.543-1.404-.87-2.74-.974-3.975.48.157.922.366 1.315.622 1.132.737 1.914 1.902 2.325 3.461zm.207 6.022c.482.368.99.712 1.513 1.028-.771.21-1.565.302-2.369.273a8 8 0 0 1-.373-.022c.458-.394.869-.823 1.228-1.279zm1.347-6.431c-.516-1.957-1.527-3.437-3.002-4.398-.647-.421-1.385-.741-2.194-.95.011-.134.026-.268.043-.4.014-.113.03-.216.046-.313.133-.689.332-1.37.589-2.025.099-.25.206-.499.321-.74l.004-.008c.177-.358.376-.719.61-1.105l.092-.152-.003-.001c.544-.851 1.197-1.627 1.942-2.311l.288.341c.672.796 1.304 1.548 1.878 2.237 1.291 1.549 2.966 3.583 3.612 4.48 1.277 1.771 1.893 3.579 1.83 5.375-.049 1.395-.461 2.755-1.195 3.933-.694 1.116-1.661 2.05-2.8 2.708-.636-.318-1.559-.839-2.539-1.599.79-1.575.952-3.28.479-5.072zm-2.575 5.397c-.725.939-1.587 1.55-2.09 1.856-.081-.029-.163-.06-.243-.093l-.065-.026c-1.49-.616-2.747-1.656-3.635-3.01-.907-1.384-1.356-2.993-1.298-4.653.041-1.19.338-2.327.882-3.379.316-.07.638-.114.96-.131l.084-.002c.162-.003.324-.003.478 0 .227.011.454.035.677.07.073 1.513.445 3.145 1.105 4.852.637 1.644 1.694 3.162 3.144 4.515z"/></svg>`,
  bugsnag:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="5" fill="#8EA9FF"/><path fill="#183E55" d="M9 5h6v9h3.8c4.3 0 7.2 2.8 7.2 6.7 0 4.2-3.2 7.3-8.1 7.3H9V15H5V9h4V5Zm6 15v3h3c1.3 0 2.1-.6 2.1-1.6 0-.9-.8-1.4-2.1-1.4h-3Z"/></svg>`,
  testrail:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#65C179" d="M7.27 23.896 4.5 21.124a.352.352 0 0 1 0-.5l2.772-2.77a.352.352 0 0 1 .5 0l2.772 2.772a.352.352 0 0 1 0 .5l-2.772 2.77a.352.352 0 0 1-.5 0H7.27zm4.48-4.48-2.772-2.772a.352.352 0 0 1 0-.498l2.772-2.772a.352.352 0 0 1 .5 0l2.77 2.772a.352.352 0 0 1 0 .5l-2.77 2.77a.352.352 0 0 1-.499 0zm4.48-4.48-2.77-2.772a.352.352 0 0 1 0-.498l2.771-2.772a.352.352 0 0 1 .5 0l2.77 2.772a.352.352 0 0 1 0 .498l-2.772 2.772a.352.352 0 0 1-.5 0h.002zm-8.876.084-2.772-2.77a.352.352 0 0 1 0-.499l2.772-2.773a.352.352 0 0 1 .5 0l2.772 2.772a.352.352 0 0 1 0 .498l-2.772 2.774a.352.352 0 0 1-.5 0v-.002zm4.48-4.48L9.062 7.77a.352.352 0 0 1 0-.5l2.772-2.772a.352.352 0 0 1 .5 0l2.77 2.772a.352.352 0 0 1 0 .498l-2.77 2.772a.352.352 0 0 1-.499 0v-.002.001zM7.44 6.15 4.666 3.37a.352.352 0 0 1 0-.5L7.44.104a.352.352 0 0 1 .5 0l2.772 2.772a.352.352 0 0 1 0 .5L7.938 6.142a.352.352 0 0 1-.5 0l.002.006v.001z"/></svg>`,
  xray:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><path fill="#40E082" d="M7 5h6l3 6 3-6h6l-6 11 6 11h-6l-3-6-3 6H7l6-11L7 5Z"/><path fill="#0b0b12" opacity=".45" d="M16 11 13 5h6l-3 6Zm0 10 3 6h-6l3-6Z"/></svg>`,
  confluence:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EDE9F6" d="M.87 18.257c-.248.382-.53.875-.763 1.245a.764.764 0 0 0 .255 1.04l4.965 3.054a.764.764 0 0 0 1.058-.26c.199-.332.454-.763.733-1.221 1.967-3.247 3.945-2.853 7.508-1.146l4.957 2.337a.764.764 0 0 0 1.028-.382l2.364-5.346a.764.764 0 0 0-.382-1 599.851 599.851 0 0 1-4.965-2.361C10.911 10.97 5.224 11.185.87 18.257zM23.131 5.743c.249-.405.531-.875.764-1.25a.764.764 0 0 0-.256-1.034L18.675.404a.764.764 0 0 0-1.058.26c-.195.335-.451.763-.734 1.225-1.966 3.246-3.945 2.85-7.508 1.146L4.437.694a.764.764 0 0 0-1.027.382L1.046 6.422a.764.764 0 0 0 .382 1c1.039.49 3.105 1.467 4.965 2.361 6.698 3.246 12.392 3.029 16.738-4.04z"/></svg>`,
  notion:`<svg class="brand-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EDE9F6" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>`,
  slack:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><path fill="#36C5F0" d="M12 3a3 3 0 0 1 3 3v7h-3a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path fill="#2EB67D" d="M29 12a3 3 0 0 1-3 3h-7v-3a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3Z"/><path fill="#ECB22E" d="M20 29a3 3 0 0 1-3-3v-7h3a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3Z"/><path fill="#E01E5A" d="M3 20a3 3 0 0 1 3-3h7v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z"/></svg>`,
  teams:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="10" width="13" height="15" rx="2" fill="#6264A7"/><rect x="12" y="7" width="10" height="13" rx="2" fill="#7B83EB"/><path fill="#fff" d="M7 14h8v2h-3v7h-2v-7H7v-2Z"/><circle cx="22" cy="8" r="3" fill="#7B83EB"/><circle cx="25" cy="14" r="2.6" fill="#5059C9"/></svg>`,
  googledrive:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><path fill="#0F9D58" d="M12 4h8l8 14h-8L12 4Z"/><path fill="#F4B400" d="M4 18 12 4l4 7-8 14-4-7Z"/><path fill="#4285F4" d="M8 25h16l4-7H12l-4 7Z"/></svg>`,
  amazons3:`<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><path fill="#FF9900" d="m16 3 11 6v14l-11 6-11-6V9l11-6Z"/><path fill="#252F3E" d="M16 8 9 12v8l7 4 7-4v-8l-7-4Zm0 3.5 3.8 2.2v4.6L16 20.5l-3.8-2.2v-4.6L16 11.5Z"/></svg>`
};
function officialLogo(label,slug){
  const svg=logoAssets[slug]||logoAssets[label?.toLowerCase?.().replace(/\s+/g,'')];
  if(svg) return `<span class="logo-wrap">${svg}</span>`;
  const initials=label.split(/\s+/).map(w=>w[0]).join('').slice(0,3).toUpperCase();
  return `<span class="logo-wrap fallback">${initials}</span>`;
}

function icon(name,color,path){return `<span class="logo-svg"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg></span>`}
/* Ambient particle field.
   Runs exactly once: the root.dataset.ready latch below is the only guard needed,
   and there is deliberately NO resize listener — re-rendering on resize is how you
   get duplicate particle sets, orphaned animations and a growing layer count. The
   particles are positioned in vw/vh and animated purely in CSS, so they already
   follow a resize on their own with no JS involved.

   Density is chosen once, from the site's own mobile breakpoint (760px, the same
   one the mobile nav uses), because it is a rendering-cost decision rather than a
   layout one. Desktop and tablet keep the original values exactly. */
const PARTICLES_DESKTOP = 160;
const PARTICLES_MOBILE = 128;   /* -20%: the count was viewport-independent, so a
                                   390px phone was drawing desktop density into
                                   ~1/5 the area, crowding the text behind it. */
const DRIFT_DESKTOP = 190;      /* peak-to-peak px of horizontal travel (±95) */
const DRIFT_MOBILE = 110;       /* ±55. On a 390px screen ±95px is ±24% of the
                                   viewport, so the fixed layer visibly sweeps
                                   sideways while the page scrolls vertically —
                                   which reads as the PAGE moving sideways. Same
                                   animation, shorter travel. */
function renderParticles(){const root=document.getElementById('ambient');if(!root||root.dataset.ready)return;if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;root.dataset.ready='1';const mobile=!!(window.matchMedia&&window.matchMedia('(max-width: 760px)').matches);const COUNT=mobile?PARTICLES_MOBILE:PARTICLES_DESKTOP;const DRIFT=mobile?DRIFT_MOBILE:DRIFT_DESKTOP;const SPEED=1.2;/* drift-speed multiplier: 1.0=baseline, 1.2=~20% faster; keep in sync with portal ambient.tsx PARTICLE_SPEED */const colors=['#fff','#c179ff','#ff4fc9','#18e1ff'];for(let i=0;i<COUNT;i++){const p=document.createElement('i');p.className='particle '+(i%9===0?'big':i%3===0?'small':'');p.style.left=Math.random()*100+'vw';p.style.top=Math.random()*100+'vh';p.style.setProperty('--x',(Math.random()*DRIFT-DRIFT/2)+'px');p.style.setProperty('--y',(Math.random()*170-85)+'px');p.style.setProperty('--d',((10+Math.random()*18)/SPEED)+'s');p.style.setProperty('--c',colors[i%colors.length]);root.appendChild(p)}}
function renderTools(){document.querySelectorAll('[data-tools]').forEach(row=>{row.innerHTML=row.dataset.tools.split(',').filter(Boolean).map(k=>{const t=officialLogos[k]||[toolData[k]?.[0]||k,k];return `<div class="tool" title="${t[0]}">${officialLogo(t[0],t[1])}<span>${t[0]}</span></div>`}).join('')})}
function get(o,path){return path.split('.').reduce((x,k)=>x&&x[k],o)}let currentLang=(function(){var m=document.cookie.match(/(?:^|; )bugitLang=([^;]+)/);return (m&&decodeURIComponent(m[1]))||localStorage.getItem('bugitLang')||'en';})();
function applyLang(lang){if(!i18n[lang])lang='en';currentLang=lang;localStorage.setItem('bugitLang',lang);(function(){var h=location.hostname,shared=(h==='bugit.dev'||/\.bugit\.dev$/.test(h));if(shared){document.cookie='bugitLang=;path=/;max-age=0;samesite=lax';document.cookie='bugitLang='+lang+';path=/;max-age=31536000;samesite=lax;domain=.bugit.dev';}else{document.cookie='bugitLang='+lang+';path=/;max-age=31536000;samesite=lax';}})();document.documentElement.lang=lang;document.documentElement.dir=RTL_LOCALES.has(lang)?'rtl':'ltr';const dict=i18n[lang];document.querySelectorAll('[data-t]').forEach(el=>{const v=get(dict,el.dataset.t);if(v!==undefined)el.textContent=v});document.querySelectorAll('[data-html]').forEach(el=>{const v=get(dict,el.dataset.html);if(v!==undefined)el.innerHTML=v});document.querySelectorAll('[data-t-aria]').forEach(el=>{const v=get(dict,el.dataset.tAria);if(v!==undefined)el.setAttribute('aria-label',v)});var _ll=document.getElementById('langLabel');if(_ll){_ll.textContent=dict.name}else{document.getElementById('langButton').textContent=dict.name}document.querySelectorAll('.lang-list button').forEach(b=>{const on=b.dataset.lang===lang;b.classList.toggle('active',on);b.setAttribute('aria-checked',on?'true':'false')});renderFaq([reqFaqItem(lang)].concat(dict.faq.items),lang);renderDocRoute();if(window.__mcRelocalize)window.__mcRelocalize()}
/* A DECLARED MENU IS A PROMISE ABOUT THE KEYBOARD, AND ONE PLACE KEEPS IT.
   External audit F-06, 2026-08-21: "Both live language menus declare menu semantics but ignore
   keyboard controls." role="menu" with menuitemradio rows, aria-haspopup and aria-expanded is
   not decoration. It tells a screen reader -- and every keyboard-only visitor -- that Enter or
   Space opens, the arrows walk the rows, Home and End jump to the ends, a letter jumps to a
   name, Escape closes and hands focus back, and Tab leaves. A buyer who cannot open the language
   menu cannot reach localized sign-in, pricing or documentation at all.

   IT IS SHARED BECAUSE THE HEADER CARRIES TWO DECLARED MENUS. The language menu and the account
   menu both say role="menu"; only the first had any of this. One implementation, or the second
   one drifts again the next time someone fixes only the menu they were told about.

   ENTER AND SPACE ARE HANDLED HERE RATHER THAN LEFT TO THE BROWSER'S SYNTHETIC CLICK, and that
   is not tidiness. A native <button> turns Enter into a click on keydown and Space into a click
   on KEYUP -- and WebKit puts focus back on the button after that keyup, so Space opened the
   menu and left focus outside it, in Safari only, while Chromium was correct. Measured in both
   engines, 2026-08-21. preventDefault() on keydown means no synthetic click is generated at all
   and one code path decides in every engine. The pointer path (btn.onclick) is untouched.

   cfg: { btn, list, items(), rove(el), current(), isOpen(), open(focus), close(giveBack) }
   open/close stay with the CALLER: each menu owns its own class name, its own aria-expanded
   sync, and -- for the language menu -- the Safari focusout guard that must not be disturbed. */
function wireMenuKeyboard(cfg){
  var btn=cfg.btn,list=cfg.list;
  /* TYPE-AHEAD, over text each ROW carries rather than a table written here. A row offers its
     visible name and its own language tag, so "d" reaches Deutsch and "j" reaches 日本語 -- and
     a locale added tomorrow is searchable the day it renders, with nothing to remember. */
  var keysOf=function(el){
    var out=[(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()];
    var tag=el.getAttribute('lang')||el.getAttribute('data-lang')||'';
    if(tag)out.push(tag.toLowerCase());
    return out.filter(Boolean);
  };
  var buf='',bufTimer=null;
  var match=function(ch){
    if(bufTimer)clearTimeout(bufTimer);
    buf+=ch.toLowerCase();
    bufTimer=setTimeout(function(){buf=''},700);
    var all=cfg.items();if(!all.length)return null;
    /* The same letter pressed again CYCLES through the rows that begin with it; anything longer
       is a prefix and searches from the row in hand. */
    var repeat=buf.length>1&&buf.split('').every(function(c){return c===buf[0]});
    var needle=repeat?buf.charAt(0):buf;
    var from=all.indexOf(document.activeElement);
    var start=(from<0?-1:from)+((repeat||buf.length===1)?1:0);
    if(start<0)start=0;
    for(var i=0;i<all.length;i++){
      var el=all[(start+i)%all.length],k=keysOf(el);
      for(var j=0;j<k.length;j++)if(k[j].indexOf(needle)===0)return el;
    }
    return null;
  };
  var printable=function(e){return !!e.key&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey};
  var openAt=function(where){
    cfg.open(false);
    var all=cfg.items();
    var want=where==='last'?all[all.length-1]:where==='first'?all[0]:cfg.current();
    cfg.rove(want);
    /* AND CHECK THAT IT LANDED, because in WebKit it does not always.
       Escape closes the menu and hands focus back with btn.focus(). Press Space next and the
       focus() this function issues, inside the keydown, is dropped: WebKit is still settling
       the focus the Escape moved, and it puts focus back on the button on the Space keyup. The
       menu is open, aria-expanded says so, and every arrow that follows goes nowhere -- which
       is a keyboard-only reader stranded on the one control that changes the site's language.
       Chromium honours it every time, which is why this survived a guard that ran in Chromium
       and was found the day one ran in WebKit.
       The rescue is deliberately narrow: one task later, and only if focus is STILL outside the
       list. If the reader has already arrowed somewhere, that is their choice and it stands.
       Asserting the effect and retrying beats trusting the call -- the same rule as waiting for
       the effect rather than a proxy signal. */
    lastWant=want;
    if(want&&document.activeElement!==want)rescue();
  };
  /* RETRY THE ACTION, DO NOT LENGTHEN THE WAIT. Whether the focus() lands is a race in WebKit,
     not a fixed delay: the same press, on the same page, lands about half the time. One retry
     at a chosen delay is another bet on the same race. So the effect is asserted and the action
     repeated on a short ladder until focus is actually inside the list, or the menu closes, or
     the budget runs out -- and only ever while focus is STILL outside the list. If the reader
     has already arrowed somewhere, that is their choice and it stands. */
  var lastWant=null;
  var rescue=function(){
    var want=lastWant;
    if(!want)return;
    var delays=[0,16,32,64,128],i=0;
    var again=function(){
      if(!cfg.isOpen())return;
      var a=document.activeElement;
      if(list.contains(a)&&a!==btn)return;             // it landed; nothing to do
      cfg.rove(want);
      if(++i<delays.length)setTimeout(again,delays[i]);
    };
    setTimeout(again,delays[0]);
  };
  /* THE THING THAT STEALS THE FOCUS IS THE KEYUP, so the answer has to run after it.
     Space on a button activates on KEYUP, and WebKit puts focus back on the button when it
     does -- after the keydown handler above has opened the menu and focused a row, and after a
     setTimeout scheduled from that keydown has already run. Escape-then-Space is where it
     shows, because Escape hands focus back with btn.focus() and the two moves collide.
     A keyboard-only reader was left with an open menu, aria-expanded saying so, and every arrow
     going nowhere: stranded on the one control that changes the site's language. Chromium
     honours the focus() every time, which is why this survived every guard that ran in Chromium
     and was found the day one ran in WebKit. */
  btn.addEventListener('keyup',function(e){
    if(e.key!==' '&&e.key!=='Spacebar'&&e.key!=='Enter')return;
    if(!cfg.isOpen()||document.activeElement!==btn)return;
    cfg.rove(lastWant||cfg.current());
    rescue();
  });
  btn.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.key===' '||e.key==='Spacebar'){
      e.preventDefault();
      if(cfg.isOpen())cfg.close(true);else openAt('current');
      return;
    }
    /* TAB OUT OF AN OPEN MENU CLOSES IT, FROM THE BUTTON TOO. The row handler below already does
       this, but it only ever sees the key when focus is INSIDE the list -- and after Space in
       WebKit focus is on the button, not in the list, so Tab left an open menu under a button
       still reporting aria-expanded="true". An open menu whose owner says it is collapsed is a
       lie told to exactly the reader this keyboard contract exists for. */
    if(e.key==='Tab'&&cfg.isOpen()){cfg.close(false);return}
    if(e.key==='ArrowDown'){e.preventDefault();openAt('first');return}
    if(e.key==='ArrowUp'){e.preventDefault();openAt('last');return}
    if(printable(e)){
      var was=cfg.isOpen();
      if(!was)cfg.open(false);
      var hit=match(e.key);
      if(hit){e.preventDefault();cfg.rove(hit)}
      else if(!was)cfg.close(false);   /* nothing matched: leave the page as it was found */
    }
  });
  /* SPACE IS DECIDED ON KEYUP IN WEBKIT, AND THAT IS WHERE IT WAS GETTING UNDONE.
     A native <button> turns Enter into a click on keydown but Space into a click on KEYUP, and
     WebKit puts focus back on the button after servicing it. So the keydown above opened the
     menu and focused a row, and a moment later focus was on the button again with the menu open:
     every arrow that followed went nowhere. Chromium restores nothing and looked correct, which
     is why this needed a second engine to see at all.
     preventDefault here stops the synthetic click. The re-assert covers the focus restore, which
     WebKit performs even when the click is cancelled -- so the fix cannot rely on the click
     alone. Reading `document.activeElement` first means a reader who has already arrowed away is
     left where they are. */
  btn.addEventListener('keyup',function(e){
    if(e.key===' '||e.key==='Spacebar')e.preventDefault();
  });
  /* THE BUTTON MUST NOT HOLD FOCUS WHILE ITS OWN MENU IS OPEN.
     Space is the case that forced this. A native <button> turns Space into a click on KEYUP, and
     WebKit restores focus to the button AFTER servicing it -- after our keyup handler has already
     run, so a synchronous `activeElement === btn` check looks correct and is then undone. The
     first attempt at this checked exactly that and passed on iPhone while still failing on
     desktop Safari, which is the same engine and a different focus path.
     Waiting a tick would be a race dressed as a fix. This waits for the EVENT instead: whenever
     the button takes focus while the menu is open, focus belongs in the list, so put it back.
     The three legitimate ways the button gets focus all close the menu FIRST -- Escape, Tab, and
     a click on the button itself -- so `isOpen()` is already false by the time they arrive and
     none of them bounce. No recursion either: roving focuses a row, which blurs the button. */
  btn.addEventListener('focus',function(){
    if(cfg.isOpen())cfg.rove(cfg.current());
  });
  list.addEventListener('keydown',function(e){
    var all=cfg.items(),at=all.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){e.preventDefault();cfg.rove(at<0?all[0]:all[(at+1)%all.length]);return}
    if(e.key==='ArrowUp'){e.preventDefault();cfg.rove(at<0?all[all.length-1]:all[(at-1+all.length)%all.length]);return}
    if(e.key==='Home'){e.preventDefault();cfg.rove(all[0]);return}
    if(e.key==='End'){e.preventDefault();cfg.rove(all[all.length-1]);return}
    /* Tab out of a menu closes it. An open menu under a button reporting itself collapsed is a
       lie told to anyone who cannot see the screen. */
    if(e.key==='Tab'){cfg.close(false);return}
    /* Space activates the focused row. Enter already does on every row here, but Space does
       nothing at all on an <a>, and the account menu's rows are links. */
    if((e.key===' '||e.key==='Spacebar')&&at>=0){e.preventDefault();all[at].click();return}
    if(printable(e)){var hit=match(e.key);if(hit){e.preventDefault();cfg.rove(hit)}}
  });
}
function initLang(){const list=document.getElementById('langList');const langTag=c=>i18n[c].name;list.innerHTML=languages.map(([c],i)=>`<button type="button" role="menuitemradio" aria-checked="false" data-lang="${c}" lang="${c}" style="--i:${i}"><span class="lang-n">${langTag(c)}</span><span class="lang-c" aria-hidden="true">${c.toUpperCase()}</span></button>`).join('');const menu=document.getElementById('langMenu'),btn=document.getElementById('langButton');btn.setAttribute('aria-haspopup','menu');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls','langList');list.setAttribute('role','menu');const items=()=>[...list.querySelectorAll('button')];
  const sync=()=>btn.setAttribute('aria-expanded',menu.classList.contains('open')?'true':'false');
  /* Roving tabindex: the eleven languages are reachable with the arrows, not with Tab. Without
     this a menu is just eleven extra tab stops wearing menu roles. */
  const rove=el=>{items().forEach(b=>b.tabIndex=b===el?0:-1);if(el)el.focus()};
  const current=()=>list.querySelector('button[aria-checked="true"]')||items()[0];
  /* The panel is display:none until `.open` lands, and focus() on a display:none element is a
     no-op that reports nothing: adding the class and focusing in the same tick left focus on
     <body>, so the menu opened and the keyboard went nowhere.
     Reading offsetHeight forces the style and layout flush synchronously, which makes the item
     focusable on the very next line. requestAnimationFrame also worked, and was the wrong tool:
     rAF is throttled in a page that is not visible, so the behaviour became a function of
     whether anyone was looking at the tab. */
  const open=(focus)=>{menu.classList.add('open');sync();void list.offsetHeight;if(focus!==false)rove(current())};
  const close=(giveBack)=>{if(!menu.classList.contains('open'))return;menu.classList.remove('open');sync();items().forEach(b=>b.tabIndex=-1);if(giveBack)btn.focus()};
  items().forEach(b=>b.tabIndex=-1);
  btn.onclick=()=>{menu.classList.contains('open')?close(false):open(true)};
  list.onclick=e=>{const b=e.target.closest('button');if(!b)return;close(true);applyLang(b.dataset.lang)};
  /* The whole keyboard contract -- Enter/Space, the arrows, Home/End, type-ahead and Tab -- is
     wireMenuKeyboard's, shared with the account menu. Escape is below, at document level,
     because it must work from anywhere the reader has got to. */
  wireMenuKeyboard({btn:btn,list:list,items:items,rove:rove,current:current,
    isOpen:()=>menu.classList.contains('open'),open:open,close:close});
  /* FOCUS LEAVING THE MENU CLOSES IT -- decided from where focus actually ENDED UP, and never
     while the opener is being pressed.
     This used to read `relatedTarget`, which is null both when focus has genuinely left the
     document and when the browser simply has not moved it yet. Safari does the second on every
     tap: it does not focus a <button> on tap, so pressing the button while the menu is open
     blurs the focused ROW to null. Reading that as "focus left" closed the menu during
     pointerdown, and the click that followed found a closed menu and opened it again -- one
     gesture, closed and reopened, and the reader sees a menu that will not close. Owner,
     2026-08-21. Chromium never does it, which is why forty guards passed.
     Deferring the check by a task was the first attempt and it is a RACE, not an order: between
     mousedown and click the event loop can turn, and in WebKit on a desktop it does -- the
     deferred check ran first, closed, and the click reopened. check-disclosure.mjs caught that
     within a minute of being written.
     So ask WHAT rather than WHEN. The one focus loss this handler must ignore is the one caused
     by a press on the button that owns the menu, and that is a state: the opener is either held
     down or it is not. Every genuine way out -- Tab, a click elsewhere, focus leaving the
     document -- arrives here with it up. */
  var pressingBtn=false;
  btn.addEventListener('pointerdown',function(){pressingBtn=true});
  window.addEventListener('pointerup',function(){pressingBtn=false},true);
  window.addEventListener('pointercancel',function(){pressingBtn=false},true);
  menu.addEventListener('focusout',function(){setTimeout(function(){
    /* The opener is mid-press: its own click is about to decide, and it is the only thing that
       should. Every other way out of this menu -- Tab, a click elsewhere, focus leaving the
       document -- reaches the line below with the button not held down. */
    if(pressingBtn)return;
    if(!menu.contains(document.activeElement))close(false);
  },0)});
  document.addEventListener('click',e=>{if(!menu.contains(e.target))close(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open'))close(true)})}
// Requirements + platform-support FAQ. Kept as a standalone localized map (not
// inside the per-locale i18n objects) so the compatibility statement stays
// identical across languages and easy to audit. Prepended to the FAQ at render.
const reqFaq={
 en:["What do I need to run BugIt?","BugIt runs inside Visual Studio Code with GitHub Copilot Chat, the Claude extension, or another assistant and a recent version of Python (3.10 to 3.13). Windows 11 is fully supported and release-validated; macOS and Linux are supported but currently in Preview while validation broadens. BugIt does not include an AI model or subscription; you bring your own."],
 de:["Was brauche ich, um BugIt zu nutzen?","BugIt läuft in Visual Studio Code mit GitHub Copilot Chat, der Claude-Erweiterung oder einem anderen Assistenten und einer aktuellen Python-Version (3.10-3.13). Windows 11 wird vollständig unterstützt und ist release-validiert; macOS und Linux werden unterstützt, befinden sich aber derzeit in der Preview, während die Validierung ausgeweitet wird. BugIt enthält kein KI-Modell und kein Abo. Das bringen Sie selbst mit."],
 es:["¿Qué necesito para usar BugIt?","BugIt funciona dentro de Visual Studio Code con GitHub Copilot Chat, la extensión de Claude u otro asistente y una versión reciente de Python (3.10-3.13). Windows 11 es totalmente compatible y está validado para producción; macOS y Linux son compatibles, pero actualmente están en Preview mientras se amplía la validación. BugIt no incluye ningún modelo de IA ni suscripción: usas la tuya."],
 fr:["De quoi ai-je besoin pour utiliser BugIt ?","BugIt fonctionne dans Visual Studio Code avec GitHub Copilot Chat, l’extension Claude ou un autre assistant et une version récente de Python (3.10-3.13). Windows 11 est entièrement pris en charge et validé pour la production ; macOS et Linux sont pris en charge mais actuellement en Preview, le temps d’élargir la validation. BugIt n’inclut ni modèle d’IA ni abonnement : vous utilisez le vôtre."],
 it:["Cosa serve per usare BugIt?","BugIt funziona in Visual Studio Code con GitHub Copilot Chat, l’estensione Claude o un altro assistente e una versione recente di Python (3.10-3.13). Windows 11 è pienamente supportato e validato per il rilascio; macOS e Linux sono supportati ma attualmente in Preview mentre la validazione si amplia. BugIt non include alcun modello di IA né abbonamento: usi il tuo."],
 "pt-br":["O que preciso para usar o BugIt?","O BugIt funciona no Visual Studio Code com o GitHub Copilot Chat, a extensão do Claude ou outro assistente e uma versão recente do Python (3.10-3.13). O Windows 11 é totalmente compatível e validado para produção; macOS e Linux são compatíveis, mas atualmente estão em Preview enquanto a validação é ampliada. O BugIt não inclui modelo de IA nem assinatura. Você usa a sua."],
 ja:["BugItの利用に何が必要ですか？","BugItは Visual Studio Code 上で、GitHub Copilot Chat、Claude 拡張機能、または他のアシスタントと、最近のバージョンの Python（3.10-3.13）とともに動作します。Windows 11 は完全対応かつリリース検証済みです。macOS と Linux も対応していますが、検証範囲の拡大中のため現在はプレビュー扱いです。BugIt には AI モデルやサブスクリプションは含まれません。ご自身のものをご利用ください。"],
 ko:["BugIt를 사용하려면 무엇이 필요한가요?","BugIt는 Visual Studio Code에서 GitHub Copilot Chat, Claude 확장, 또는 다른 어시스턴트와 최신 버전의 Python(3.10-3.13)과 함께 실행됩니다. Windows 11은 완전히 지원되며 출시 검증을 마쳤습니다. macOS와 Linux도 지원되지만, 검증 범위를 넓히는 동안 현재는 프리뷰 상태입니다. BugIt에는 AI 모델이나 구독이 포함되어 있지 않으며, 직접 준비한 것을 사용합니다."],
 zh:["运行 BugIt 需要什么？","BugIt 在 Visual Studio Code 中运行，需要 GitHub Copilot Chat、Claude 扩展或其他助手，以及较新版本的 Python（3.10-3.13）。Windows 11 已获完全支持并通过发布验证；macOS 和 Linux 也受支持，但在验证范围扩大期间目前为预览（Preview）状态。BugIt 不含 AI 模型或订阅，请使用你自己的。"],
 ru:["Что нужно для работы BugIt?","BugIt работает в Visual Studio Code с GitHub Copilot Chat, расширением Claude или другим ассистентом и актуальной версией Python (3.10-3.13). Windows 11 полностью поддерживается и проверена для релиза; macOS и Linux поддерживаются, но сейчас находятся в статусе Preview, пока расширяется проверка. BugIt не включает модель ИИ или подписку. Вы используете свою."],
  ar: [
  "ما الذي أحتاجه لتشغيل BugIt؟",
  "يعمل BugIt داخل Visual Studio Code مع GitHub Copilot Chat أو امتداد Claude أو مساعد آخر، إلى جانب إصدار حديث من Python (3.10 إلى 3.13). نظام Windows 11 مدعوم بالكامل ومُعتمَد للإصدار؛ نظاما macOS وLinux مدعومان لكنهما حاليًا في وضع Preview أثناء توسيع التحقق. لا يتضمن BugIt نموذج ذكاء اصطناعي أو اشتراكًا؛ أنت تستخدم نموذجك الخاص."
]
};
function reqFaqItem(lang){return reqFaq[lang]||reqFaq.en}
// The homepage shows only the questions that decide a PURCHASE; the full list lives at
// #/docs/faq. Fifteen stacked rows under the pricing section read as a wall and pushed the
// documentation strip far below the fold. Kept on the page rather than moved off it entirely
// because these are the objections someone has while looking at the price.
//
// Sliced positionally, which is safe here: every locale carries the same questions in the same
// order (they were translated from one source), and the requirements item is prepended by the
// caller, so `HOMEPAGE_FAQ_COUNT` means the same six questions in every language.
const HOMEPAGE_FAQ_COUNT=6;
// Standalone label map, same pattern as `reqFaq`: one place to audit, and it cannot drift into
// the per-locale objects that are defined twice.
const faqMoreLabel={en:'See all questions',ja:'すべての質問を見る',es:'Ver todas las preguntas',fr:'Voir toutes les questions',de:'Alle Fragen ansehen','pt-br':'Ver todas as perguntas',it:'Vedi tutte le domande',ko:'모든 질문 보기',zh:'查看全部问题',ru:'Смотреть все вопросы'};
/* The homepage FAQ is an EXCLUSIVE accordion: opening one question closes the one before it.
   `name` is the native mechanism and needs no script, which also means it keeps working if this
   file fails to load. The listener below is the fallback for browsers that predate it, and it
   is a no-op where the browser has already closed the sibling.
   It is registered in the CAPTURE phase because `toggle` does not bubble, and once on the
   container rather than per <details>, because the container outlives the innerHTML on every
   language change while the elements inside it do not. Setting open=false re-enters this
   handler, which is why it returns immediately for a details that is closing. */
function renderFaq(items,lang){const box=document.getElementById('faqList');if(box)box.innerHTML=items.slice(0,HOMEPAGE_FAQ_COUNT).map((x,i)=>`<details name="homefaq"><summary>${x[0]}</summary><p>${x[1]}</p></details>`).join('');
if(box&&!box.dataset.accordion){box.dataset.accordion='1';box.addEventListener('toggle',e=>{const d=e.target;if(!d||d.tagName!=='DETAILS'||!d.open)return;box.querySelectorAll('details[open]').forEach(o=>{if(o!==d)o.open=false});},true);
/* Click anywhere outside the list and the open question closes. Bound to the document once,
   and it reads `box` from this closure, so it keeps working across every re-render.
   `pointerdown` rather than `click`: a click fires only after release, so dragging to select
   an answer and releasing outside would collapse the very text being read. It also fires
   before the browser toggles a <summary>, which keeps the two from racing.
   The contains() test uses the container, not the details, so clicking a second question is
   handled by the accordion above rather than being closed here first. */
document.addEventListener('pointerdown',e=>{if(!box.isConnected||box.contains(e.target))return;box.querySelectorAll('details[open]').forEach(o=>{o.open=false});});}const more=document.getElementById('faqMoreLink');if(more){const label=faqMoreLabel[lang]||faqMoreLabel.en;more.textContent=label+' →';more.hidden=items.length<=HOMEPAGE_FAQ_COUNT}}

// Localized "Sign in" label injected into every language's cta dictionary.
const signinLabels={ar:'تسجيل الدخول',en:'Sign in',ja:'ログイン',fr:'Se connecter',de:'Anmelden',es:'Iniciar sesión','pt-br':'Entrar',it:'Accedi',ko:'로그인',zh:'登录',ru:'Войти'};
for(const c in i18n){if(i18n[c]&&i18n[c].cta)i18n[c].cta.signin=signinLabels[c]||signinLabels.en;}

// Localized labels for the authenticated account menu, injected per language.
const accountLabels={
  ar: {
  myAccount: "حسابي",
  dashboard: "لوحة التحكم",
  licenses: "التراخيص",
  downloads: "التنزيلات",
  settings: "إعدادات الحساب",
  signout: "تسجيل الخروج",
  menu: "قائمة الحساب"
},
  en:{myAccount:'My account',dashboard:'Dashboard',licenses:'Licenses',downloads:'Downloads',settings:'Account settings',signout:'Sign out',menu:'Account menu'},
  ja:{myAccount:'アカウント',dashboard:'ダッシュボード',licenses:'ライセンス',downloads:'ダウンロード',settings:'アカウント設定',signout:'ログアウト',menu:'アカウントメニュー'},
  fr:{myAccount:'Mon compte',dashboard:'Tableau de bord',licenses:'Licences',downloads:'Téléchargements',settings:'Paramètres du compte',signout:'Se déconnecter',menu:'Menu du compte'},
  de:{myAccount:'Mein Konto',dashboard:'Dashboard',licenses:'Lizenzen',downloads:'Downloads',settings:'Kontoeinstellungen',signout:'Abmelden',menu:'Kontomenü'},
  es:{myAccount:'Mi cuenta',dashboard:'Panel',licenses:'Licencias',downloads:'Descargas',settings:'Configuración de la cuenta',signout:'Cerrar sesión',menu:'Menú de la cuenta'},
  'pt-br':{myAccount:'Minha conta',dashboard:'Painel',licenses:'Licenças',downloads:'Downloads',settings:'Configurações da conta',signout:'Sair',menu:'Menu da conta'},
  it:{myAccount:'Il mio account',dashboard:'Dashboard',licenses:'Licenze',downloads:'Download',settings:'Impostazioni account',signout:'Esci',menu:'Menu account'},
  ko:{myAccount:'내 계정',dashboard:'대시보드',licenses:'라이선스',downloads:'다운로드',settings:'계정 설정',signout:'로그아웃',menu:'계정 메뉴'},
  zh:{myAccount:'我的账户',dashboard:'仪表板',licenses:'许可证',downloads:'下载',settings:'账户设置',signout:'退出登录',menu:'账户菜单'},
  ru:{myAccount:'Мой аккаунт',dashboard:'Панель',licenses:'Лицензии',downloads:'Загрузки',settings:'Настройки аккаунта',signout:'Выйти',menu:'Меню аккаунта'}
};
/* NOTE: accountLabels is applied at the BOTTOM of this file, not here. Applying
   it at this point silently loses every translation above: the generated
   add(...) overrides later merge each locale from the English base, which puts
   English account labels back. That is exactly what shipped -- ja rendered
   "Dashboard / Licenses / Downloads / Account settings / Sign out". */

const docRoutes=['docs','docs/getting-started','docs/user-guide','docs/overview','docs/license','docs/privacy','docs/refund','docs/commerce','docs/faq','support'];
// Old getting-started / user-guide routes now resolve to the unified docs page.
function route(){return location.hash.replace(/^#\/?/,'').replace(/^\//,'');}

const docUiText={
  ar: {
  openTicket: "افتح تذكرة دعم"
,onThisPage:'في هذه الصفحة',breadcrumb:'مسار التنقل',toTop:'العودة إلى الأعلى'},
  en:{openTicket:'Open a support ticket',onThisPage:'On this page',breadcrumb:'Breadcrumb',toTop:'Back to top'},
  ja:{openTicket:'サポートチケットを送信',onThisPage:'このページの内容',breadcrumb:'パンくずリスト',toTop:'ページ上部へ戻る'},
  fr:{openTicket:'Ouvrir un ticket de support',onThisPage:'Sur cette page',breadcrumb:'Fil d\'Ariane',toTop:'Retour en haut'},
  de:{openTicket:'Support-Ticket öffnen',onThisPage:'Auf dieser Seite',breadcrumb:'Brotkrümelnavigation',toTop:'Nach oben'},
  es:{openTicket:'Abrir un ticket de soporte',onThisPage:'En esta página',breadcrumb:'Ruta de navegación',toTop:'Volver arriba'},
  'pt-br':{openTicket:'Abrir um chamado de suporte',onThisPage:'Nesta página',breadcrumb:'Trilha de navegação',toTop:'Voltar ao topo'},
  it:{openTicket:'Apri un ticket di supporto',onThisPage:'In questa pagina',breadcrumb:'Percorso di navigazione',toTop:'Torna su'},
  ko:{openTicket:'지원 티켓 등록',onThisPage:'이 페이지의 내용',breadcrumb:'경로 탐색',toTop:'맨 위로'},
  zh:{openTicket:'提交支持工单',onThisPage:'本页内容',breadcrumb:'面包屑导航',toTop:'回到顶部'},
  ru:{openTicket:'Создать обращение в поддержку',onThisPage:'На этой странице',breadcrumb:'Навигационная цепочка',toTop:'Наверх'}
};
// Document card labels. `userGuide`/`overview` are the plain document NAMES (the
// card now offers separate Preview + Download actions, so the name no longer
// carries a "Download" verb). `preview`/`download` are the two action buttons.
const docDownloadLabels={
  ar: {
  userGuide: "دليل المستخدم",
  overview: "نظرة عامة على وكيل ضمان الجودة",
  ugDesc: "الدليل الكامل خطوة بخطوة للإعداد والاستخدام.",
  ovDesc: "نظرة موجزة على وكيل BugIt لضمان الجودة.",
  preview: "معاينة",
  download: "تحميل"
},
  en:{userGuide:"User Guide",overview:"QA Agent Overview",ugDesc:"The complete step-by-step setup and usage guide.",ovDesc:"A concise overview of the BugIt QA Agent.",preview:"Preview",download:"Download"},
  ja:{userGuide:"ユーザーガイド",overview:"QAエージェント概要",ugDesc:"インストールから使い方までの完全な手順ガイド。",ovDesc:"BugIt QAエージェントの簡潔な概要。",preview:"プレビュー",download:"ダウンロード"},
  fr:{userGuide:"Guide utilisateur",overview:"Vue d'ensemble de l'agent QA",ugDesc:"Le guide complet d'installation et d'utilisation, étape par étape.",ovDesc:"Une présentation concise de l'agent QA BugIt.",preview:"Aperçu",download:"Télécharger"},
  de:{userGuide:"Benutzerhandbuch",overview:"QA-Agent-Übersicht",ugDesc:"Die vollständige Schritt-für-Schritt-Anleitung zu Einrichtung und Nutzung.",ovDesc:"Ein kompakter Überblick über den BugIt QA-Agenten.",preview:"Vorschau",download:"Herunterladen"},
  es:{userGuide:"Guía de usuario",overview:"Resumen del agente QA",ugDesc:"La guía completa de instalación y uso paso a paso.",ovDesc:"Un resumen conciso del agente QA de BugIt.",preview:"Vista previa",download:"Descargar"},
  "pt-br":{userGuide:"Guia do usuário",overview:"Visão geral do agente de QA",ugDesc:"O guia completo de instalação e uso, passo a passo.",ovDesc:"Uma visão geral concisa do agente de QA do BugIt.",preview:"Visualizar",download:"Baixar"},
  it:{userGuide:"Guida utente",overview:"Panoramica dell'agente QA",ugDesc:"La guida completa all'installazione e all'uso, passo dopo passo.",ovDesc:"Una panoramica sintetica dell'agente QA di BugIt.",preview:"Anteprima",download:"Scarica"},
  ko:{userGuide:"사용자 가이드",overview:"QA 에이전트 개요",ugDesc:"설치부터 사용까지 전체 단계별 가이드.",ovDesc:"BugIt QA 에이전트에 대한 간결한 개요.",preview:"미리 보기",download:"다운로드"},
  zh:{userGuide:"用户指南",overview:"QA 代理概览",ugDesc:"从安装到使用的完整分步指南。",ovDesc:"BugIt QA 代理的简明概览。",preview:"预览",download:"下载"},
  ru:{userGuide:"Руководство пользователя",overview:"Обзор QA-агента",ugDesc:"Полное пошаговое руководство по установке и использованию.",ovDesc:"Краткий обзор QA-агента BugIt.",preview:"Просмотр",download:"Скачать"}
};
// Languages that have a full localized PDF guide set under /public/docs/guides/<lang>/
// (User Guide + Overview). A language outside this list falls back to the English PDF.
const docGuideLangs=['ar','en','de','es','fr','it','ja','ko','pt-br','ru','zh'];
const BASE_TITLE='BugIt | QA Bug-Filing Agent for VS Code';
// --- Localized homepage <title> + meta description (WEB Phase H) --------------
// English is the explicit fallback: every locale inherits i18n.en.meta unless it
// overrides below, and renderDocRoute() reads i18n[lang].meta||i18n.en.meta.
i18n.en.meta={title:BASE_TITLE,description:'BugIt turns rough test notes into polished, reviewed bug tickets filed to your tracker after your approval.'};
i18n.en.notFound={eyebrow:'404',title:'Page not found',body:'That page doesn’t exist. The link may be mistyped, or the page may have moved.',docs:'Browse documentation',home:'Back to home'};
const _siteMeta={
  ar:{title:"BugIt | وكيل ضمان الجودة المدعوم بالذكاء الاصطناعي لـ VS Code",description:"يحوّل BugIt الملاحظات الأولية إلى تقارير خلل مراجَعة ومدقَّقة يتم تسجيلها في نظام التتبع الخاص بك بعد موافقتك."},
  ja:{title:'BugIt | VS Code 向け QA バグ起票エージェント',description:'BugItはラフなテストメモを、確認済みのきれいなバグチケットに変換し、あなたの承認後にトラッカーへ登録します。'},
  fr:{title:'BugIt | Agent QA de création de tickets pour VS Code',description:'BugIt transforme vos notes de test en tickets de bug soignés et relus, déposés dans votre tracker après votre approbation.'},
  de:{title:'BugIt | QA-Agent zur Fehlererfassung für VS Code',description:'BugIt verwandelt grobe Testnotizen in geprüfte, aufbereitete Bug-Tickets, die nach Ihrer Freigabe in Ihrem Tracker angelegt werden.'},
  es:{title:'BugIt | Agente QA de registro de errores para VS Code',description:'BugIt convierte notas de prueba en tickets de error pulidos y revisados, registrados en tu tracker tras tu aprobación.'},
  'pt-br':{title:'BugIt | Agente de QA para registro de bugs no VS Code',description:'O BugIt transforma anotações de teste em tickets de bug revisados e organizados, registrados no seu tracker após sua aprovação.'},
  it:{title:'BugIt | Agente QA per la segnalazione di bug in VS Code',description:'BugIt trasforma le note di test in ticket di bug curati e revisionati, inviati al tuo tracker dopo la tua approvazione.'},
  ko:{title:'BugIt | VS Code용 QA 버그 제출 에이전트',description:'BugIt는 대략적인 테스트 메모를 검토된 깔끔한 버그 티켓으로 변환하여 승인 후 트래커에 등록합니다.'},
  zh:{title:'BugIt | 适用于 VS Code 的 QA 缺陷提交代理',description:'BugIt 将粗略的测试笔记转化为经过审核的规范缺陷工单，并在你确认后提交到你的追踪器。'},
  ru:{title:'BugIt | QA-агент для заведения багов в VS Code',description:'BugIt превращает черновые заметки тестирования в проверенные аккуратные баг-тикеты и создаёт их в вашем трекере после вашего подтверждения.'}
};
const _siteNotFound={
  ja:{title:'ページが見つかりません',body:'そのページは存在しません。リンクが間違っているか、ページが移動した可能性があります。',docs:'ドキュメントを見る',home:'ホームに戻る'},
  fr:{title:'Page introuvable',body:'Cette page n’existe pas. Le lien est peut-être incorrect ou la page a été déplacée.',docs:'Voir la documentation',home:'Retour à l’accueil'},
  de:{title:'Seite nicht gefunden',body:'Diese Seite existiert nicht. Der Link ist möglicherweise falsch oder die Seite wurde verschoben.',docs:'Dokumentation ansehen',home:'Zurück zur Startseite'},
  es:{title:'Página no encontrada',body:'Esa página no existe. Puede que el enlace sea incorrecto o que la página se haya movido.',docs:'Ver documentación',home:'Volver al inicio'},
  'pt-br':{title:'Página não encontrada',body:'Essa página não existe. O link pode estar incorreto ou a página pode ter sido movida.',docs:'Ver documentação',home:'Voltar ao início'},
  it:{title:'Pagina non trovata',body:'Questa pagina non esiste. Il link potrebbe essere errato o la pagina potrebbe essere stata spostata.',docs:'Vedi la documentazione',home:'Torna alla home'},
  ko:{title:'페이지를 찾을 수 없습니다',body:'해당 페이지가 존재하지 않습니다. 링크가 잘못되었거나 페이지가 이동되었을 수 있습니다.',docs:'문서 보기',home:'홈으로 돌아가기'},
  zh:{title:'找不到页面',body:'该页面不存在。链接可能有误，或页面已被移动。',docs:'浏览文档',home:'返回首页'},
  ru:{title:'Страница не найдена',body:'Такой страницы нет. Возможно, ссылка неверна или страница была перемещена.',docs:'Открыть документацию',home:'На главную'}
};
// Applied AFTER the generated per-locale overrides at the end of this file (which
// re-run add()=merge(i18n.en,…) and would otherwise copy the English meta back over
// these). Every locale still keeps i18n.en.meta/notFound as its explicit fallback.
function applyLocalizedSiteMeta(){
  for(const c in _siteMeta){if(i18n[c])i18n[c].meta=_siteMeta[c];}
  for(const c in _siteNotFound){if(i18n[c])i18n[c].notFound={eyebrow:'404',...(_siteNotFound[c])};}
}
// --- Language catalogue (WEB Phase I, BQA-023) --------------------------------
// TWO DISTINCT axes kept deliberately separate so the catalogue claim stays truthful:
//   documentationLocales — the languages THIS SITE's UI + PDF guides ship in.
//       English is the Supported base; the rest are machine-translated and shown as
//       "(Preview)" in the language picker (see initLang()).
//   reportLanguages — the languages the BugIt AGENT can WRITE BUG REPORTS in. Mirrors
//       the agent's tools/language_tiers.py source of truth: English base, a documented
//       Preview allowlist, and Arabic flagged right-to-left / not yet layout-validated.
// English ('en') is the explicit fallback on both axes. scripts/check-languages.mjs
// enforces this shape and, when the agent repo is present, cross-checks it against
// tools/language_tiers.py so the two never drift.
const languageCatalogue={
  base:'en',
  fallback:'en',
  documentationLocales:{
    supported:['en'],
    preview:['ja','fr','de','es','pt-br','it','ko','zh','ru','ar']
  },
  reportLanguages:{
    supported:['en'],
    preview:['es-419','zh-hant','pl','nl','tr','ar'],
    rtlUnvalidated:['ar']
  }
};
if(typeof window!=='undefined')window.__bugitLanguageCatalogue=languageCatalogue;
function setMetaDescription(text){if(typeof text!=='string')return;var m=document.querySelector('meta[name="description"]');if(m)m.setAttribute('content',text);}
/* Fetch the first URL that returns OK text. Used for localized legal docs:
   try the language-specific file first, then fall back to the English original. */
function fetchFirstText(urls){
  return urls.reduce((p,u)=>p.catch(()=>fetch(u).then(x=>x.ok?x.text():Promise.reject())),Promise.reject());
}
// Point the skip link at whichever <main> is currently active (AUD-1.1.0-008) and, on activation,
// move focus there (href-jump alone does not reliably move AT focus).
function updateSkipTarget(){
  const skip=document.getElementById('skipLink');if(!skip)return;
  const doc=document.getElementById('docView');
  skip.setAttribute('href','#'+((doc&&!doc.hidden)?'docView':'homeView'));
}
document.addEventListener('DOMContentLoaded',()=>{
  const skip=document.getElementById('skipLink');if(!skip)return;
  skip.addEventListener('click',e=>{
    e.preventDefault();
    const doc=document.getElementById('docView');
    const main=(doc&&!doc.hidden)?doc:document.getElementById('homeView');
    if(main){main.focus();main.scrollIntoView();}
  });
});
// A localized not-found view for unknown SPA routes (AUD-1.1.0-009): an unknown `#/...` route must
// NOT silently render the homepage. Rendered into the docView container with a recovery link home.
function notFoundText(lang){
  const t={
    en:{title:'Page not found',body:'That page does not exist.',home:'Go to the homepage'},
    ja:{title:'ページが見つかりません',body:'そのページは存在しません。',home:'ホームページへ'},
    fr:{title:'Page introuvable',body:"Cette page n'existe pas.",home:"Aller à l'accueil"},
    de:{title:'Seite nicht gefunden',body:'Diese Seite existiert nicht.',home:'Zur Startseite'},
    es:{title:'Página no encontrada',body:'Esa página no existe.',home:'Ir a la página de inicio'},
    'pt-br':{title:'Página não encontrada',body:'Essa página não existe.',home:'Ir para a página inicial'},
    it:{title:'Pagina non trovata',body:'Questa pagina non esiste.',home:'Vai alla home'},
    ko:{title:'페이지를 찾을 수 없습니다',body:'해당 페이지가 존재하지 않습니다.',home:'홈페이지로 이동'},
    zh:{title:'页面未找到',body:'该页面不存在。',home:'返回首页'},
    ru:{title:'Страница не найдена',body:'Такой страницы не существует.',home:'На главную'},
    ar:{title:'الصفحة غير موجودة',body:'هذه الصفحة غير موجودة.',home:'الذهاب إلى الصفحة الرئيسية'}
  };
  return t[lang]||t.en;
}
function renderNotFound(){
  const home=document.getElementById('homeView'),doc=document.getElementById('docView');
  const lang=i18n[currentLang]?currentLang:'en';
  const nf=notFoundText(lang);
  home.hidden=true;doc.hidden=false;
  // Write INTO the docs containers, never over them. This used to replace the whole of
  // #docView, which destroyed the .docs-layout holding #docNav and #docContent -- and
  // nothing ever put them back. So one mistyped hash left the reader stranded: every later
  // docs link threw "Cannot read properties of null (reading 'classList')" and re-rendered
  // the 404, with only F5 as a way out. (External LQA report FUNC-001.)
  const nav=document.getElementById('docNav'),content=document.getElementById('docContent');
  nav.hidden=true;nav.innerHTML='';
  content.innerHTML='<section class="doc-notfound" style="padding:96px 0;text-align:center">'
    +'<h1>'+nf.title+'</h1><p>'+nf.body+'</p>'
    +'<p><a class="doc-btn" href="#/">'+nf.home+'</a></p></section>';
  document.title=nf.title+' | '+BASE_TITLE;
  updateSkipTarget();
}
function renderDocRoute(){
  const r=route();
  const home=document.getElementById('homeView'),doc=document.getElementById('docView');
  // A route is a SPA route only when the hash begins with "#/". Bare "#anchor" links (e.g. the
  // header's #features/#pricing) are in-page anchors and must fall through to the homepage.
  const isSpaRoute=/^#\/.+/.test(location.hash);
  if(!docRoutes.includes(r)){
    if(r!==''&&isSpaRoute){renderNotFound();return}      // unknown SPA route -> localized not-found
    const lang=i18n[currentLang]?currentLang:'en';
    const _md=(i18n[lang].meta)||i18n.en.meta;
    home.hidden=false;doc.hidden=true;
    document.title=(_md&&_md.title)||BASE_TITLE;
    setMetaDescription(_md&&_md.description);
    updateSkipTarget();return
  }
  home.hidden=true;doc.hidden=false;
  const lang=i18n[currentLang]?currentLang:'en';
  const d={...i18n.en.docPages,...(i18n[lang].docPages||{})};
  const labels={...i18n.en.docs,...(i18n[lang].docs||{})};
  const dl=docDownloadLabels[lang]||docDownloadLabels.en;
  const ui={...docUiText.en,...(docUiText[lang]||{})};
  const nav=[['#/docs',i18n[lang].nav.docs],['#/docs/license',labels.license],['#/docs/privacy',labels.privacy],['#/docs/refund',labels.refund],['#/docs/commerce',labels.commerce],['#/docs/faq','FAQ'],['#/support',labels.support]];
  const _dn=document.getElementById('docNav');_dn.hidden=false;/* the 404 view hides it */
  _dn.classList.remove('open');/* every render starts collapsed on mobile */
  const _activeLabel=(nav.find(([h])=>h.slice(2)===r)||nav[0])[1];
  const _links=nav.map(([href,label])=>`<a class="${href.slice(2)===r?'active':''}"${href.slice(2)===r?' aria-current="page"':''} href="${href}">${label}</a>`).join('');
  _dn.innerHTML=`<button type="button" class="docs-nav-toggle" aria-expanded="false" aria-controls="docNavList"><span class="docs-nav-current">${_activeLabel}</span><span class="docs-nav-caret" aria-hidden="true">▾</span></button><div class="docs-nav-list" id="docNavList">${_links}</div>`;
  const titles={docs:d.homeTitle,'docs/getting-started':dl.userGuide,'docs/user-guide':dl.userGuide,'docs/overview':dl.overview,'docs/license':d.licenseTitle,'docs/privacy':d.privacyTitle,'docs/refund':d.refundTitle,'docs/commerce':d.commerceTitle,'docs/faq':d.faqTitle,support:d.supportTitle};
  let body='',lede='';
  if(r==='docs'){
    const dl=docDownloadLabels[lang]||docDownloadLabels.en;
    const pdfLang=docGuideLangs.includes(lang)?lang:'en';
    // Highlights preview (the on-page quick read) + a direct download of the full PDF guide.
    const card=(route,pdf,dlName,name,desc)=>`<div class="doc-download-card">`
      +`<b>${name}</b><small>${desc}</small>`
      +`<div class="doc-actions">`
        +`<a class="doc-btn doc-btn-preview" href="${route}">${dl.preview}</a>`
        +`<a class="doc-btn doc-btn-download" href="/public/docs/guides/${pdfLang}/${pdf}" download="${dlName}">${dl.download} PDF</a>`
      +`</div></div>`;
    lede=d.homeIntro;
    // The two guides are the things a reader came for, so they keep the whole width and both
    // actions. The rest of the documentation was reachable only from the sidebar or the
    // footer; it is a shelf now, with the same descriptions the homepage already uses.
    const shelf=[['#/docs/license',labels.license,labels.licenseDesc],
                 ['#/docs/privacy',labels.privacy,labels.privacyDesc],
                 ['#/docs/refund',labels.refund,labels.refundDesc],
                 ['#/docs/commerce',labels.commerce,labels.commerceDesc],
                 ['#/docs/faq','FAQ',labels.faqDesc],
                 ['#/support',labels.support,labels.supportDesc]];
    body=`<div class="doc-download-cards">`
      +card('#/docs/user-guide','user-guide.pdf','BugIt-User-Guide.pdf',dl.userGuide,dl.ugDesc)
      +card('#/docs/overview','overview.pdf','BugIt-QA-Agent-Overview.pdf',dl.overview,dl.ovDesc)
      +`</div><div class="doc-shelf">`
      +shelf.map(([href,name,desc])=>`<a class="doc-shelf-card" href="${href}">`
        +`<span class="doc-shelf-name">${name}</span>`
        +`<span class="doc-shelf-desc">${desc||''}</span>`
        +`<span class="doc-shelf-go" aria-hidden="true"></span></a>`).join('')
      +`</div><p class="note">${d.englishOnly}</p>`;
  }else if(r==='docs/getting-started'||r==='docs/user-guide'||r==='docs/overview'){
    const dl=docDownloadLabels[lang]||docDownloadLabels.en;
    // Keyed on the DOCUMENT, not on which of two route names was used. Until 2026-08-18 the
    // route table and the PDF selector both said docs/user-guide meant the Overview and
    // docs/getting-started meant the User Guide. They agreed with each other, so clicking
    // through the cards always worked and only a shared or indexed URL exposed it: a link
    // reading /#/docs/user-guide opened the Overview (external audit, F-15).
    const isOverview=r==='docs/overview';
    const pdfLang=docGuideLangs.includes(lang)?lang:'en';
    const pdf=isOverview?'overview.pdf':'user-guide.pdf';
    const dlName=isOverview?'BugIt-QA-Agent-Overview.pdf':'BugIt-User-Guide.pdf';
    const pdfUrl=`/public/docs/guides/${pdfLang}/${pdf}`;
    // Quick highlights render below; the full guide opens inline (preview) or downloads as PDF.
    body=`<div class="doc-pdf-actions">`
        +`<a class="doc-btn doc-btn-preview" href="${pdfUrl}" target="_blank" rel="noopener">${dl.preview} PDF</a>`
        +`<a class="doc-btn doc-btn-download" href="${pdfUrl}" download="${dlName}">${dl.download} PDF</a>`
      +`</div>`
      +`<div id="guideText" class="license-doc" aria-busy="true">${docSkeleton()}</div>`;
  }else if(r==='docs/faq'){
    body=`<div class="faq-doc license-doc">${[reqFaqItem(lang)].concat(i18n[lang].faq.items).map(([q,a])=>`<h2 class="license-title">${q}</h2><p>${a}</p>`).join('')}</div>`;
  }else if(r==='support'){
    // The old support page said "Support" three times over: an eyebrow, the H1, and again as
    // the first card's H2. The H1 is the page's name; the first card is simply the action.
    lede=d.supportIntro;
    body=`<div class="support-box">`
      +`<div class="support-card support-primary">`
        +`<span class="support-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.9" y="4.4" width="18.2" height="12.4" rx="2.6"/><path d="M8.6 16.8v3.5l4.1-3.5"/><path d="M7.5 9.3h9"/><path d="M7.5 12.3h5.6"/></svg></span>`
        +`<a class="doc-button" href="https://portal.bugit.dev/dashboard/support"><span>${ui.openTicket}</span><i aria-hidden="true"></i></a>`
        +`<p class="note support-fine">${d.englishOnly}</p>`
      +`</div>`
      +`<div class="support-card">`
        +`<span class="support-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 4.6 6v5.4c0 4.5 3.1 8.1 7.4 9.4 4.3-1.3 7.4-4.9 7.4-9.4V6z"/><path d="M9.4 12.1l1.9 1.9 3.6-3.8"/></svg></span>`
        +`<h2>${d.before}</h2><p>${d.beforeText}</p>`
      +`</div></div>`;
  /* NO LEDE ON THE TWO LEGAL DOCUMENTS. Owner: "i dont think we need those small points in the
     first paragraph of license agreement and privacy policy, its just a summary of the document
     right?? if so then better remove it and let them read the whole thing."
     It is exactly that, and both documents already open with their own: the licence with the
     paragraph that binds the reader, the privacy policy with its own "In short" section, both
     written by the people who wrote the clauses and translated with them. A second summary above
     them, assembled from `sections[2]` and `sections[3]`, said the same things in different words
     -- which on a legal page is not just redundant, it is a second version of the terms.
     `sections` stays in the dictionaries: it is a translated string in eleven languages and the
     parity guards count it. It is simply no longer printed above the document it summarises. */
  }else if(r==='docs/license'){
    body=`<div id="licenseText" class="license-doc" aria-busy="true">${docSkeleton()}</div>`;
  }else if(r==='docs/privacy'){
    body=`<div id="privacyText" class="license-doc" aria-busy="true">${docSkeleton()}</div>`;
  }else if(r==='docs/refund'){
    lede=d.refundIntro;
    body=`<div id="refundText" class="license-doc" aria-busy="true">${docSkeleton()}</div>`;
  }else if(r==='docs/commerce'){
    lede=d.commerceIntro;
    body=`<div id="commerceText" class="license-doc" aria-busy="true">${docSkeleton()}</div>`;
  }
  const crumb=r==='docs'?'':`<nav class="doc-crumb" aria-label="${escapeHtml(ui.breadcrumb)}">`
      +`<a href="#/docs">${i18n[lang].nav.docs}</a>`
      +`<span aria-hidden="true">/</span><b>${titles[r]}</b></nav>`;
  document.getElementById('docContent').innerHTML=
    `<div class="doc-rail" aria-hidden="true"><i></i></div>`
    +`<header class="doc-head">${crumb}<h1>${titles[r]}</h1>`
    +(lede?`<p class="doc-lede${lede.length>180?' doc-lede-long':''}">${lede}</p>`:'')
    +`</header>`+body;
  docReadingUi(r,ui);
  document.title=`${titles[r]} · BugIt`;
  const token=docRenderToken;
  if(r==='docs/getting-started'||r==='docs/user-guide'||r==='docs/overview'){
    const box=document.getElementById('guideText');
    const stem=r==='docs/overview'?'OVERVIEW':'GETTING_STARTED';
    // Localized highlights first, English original as fallback — so a language whose
    // highlights are not yet translated still shows the guide instead of an error.
    const urls=lang==='en'?[`/public/docs/${stem}.web.md`]:[`/public/docs/${stem}.${lang}.web.md`,`/public/docs/${stem}.web.md`];
    fetchFirstText(urls)
      .then(txt=>{if(box){box.innerHTML=formatMarkdownDoc(txt);box.removeAttribute('aria-busy');docReadingReady(token);}})
      .catch(()=>{if(box)box.innerHTML='<p class="license-copy">This guide is temporarily unavailable. Please refresh the page or open a support ticket.</p>';});
  }else if(r==='docs/license'){
    const box=document.getElementById('licenseText');
    const urls=lang==='en'?['/public/docs/LICENSE.txt']:['/public/docs/LICENSE.'+lang+'.txt','/public/docs/LICENSE.txt'];
    fetchFirstText(urls)
      .then(txt=>{if(box){box.innerHTML=formatLicense(txt);box.removeAttribute('aria-busy');docReadingReady(token);}})
      .catch(()=>{if(box)box.innerHTML='<p class="license-copy">The license text is temporarily unavailable. Please refresh the page, or contact support@bugit.dev.</p>';});
  }else if(r==='docs/privacy'){
    const box=document.getElementById('privacyText');
    const urls=lang==='en'?['/public/docs/PRIVACY.md']:['/public/docs/PRIVACY.'+lang+'.md','/public/docs/PRIVACY.md'];
    fetchFirstText(urls)
      .then(txt=>{if(box){box.innerHTML=formatMarkdownDoc(txt);box.removeAttribute('aria-busy');docReadingReady(token);}})
      .catch(()=>{if(box)box.innerHTML='<p class="license-copy">The privacy statement is temporarily unavailable. Please refresh the page, or contact support@bugit.dev.</p>';});
  }else if(r==='docs/refund'){
    const box=document.getElementById('refundText');
    const urls=lang==='en'?['/public/docs/REFUND.md']:['/public/docs/REFUND.'+lang+'.md','/public/docs/REFUND.md'];
    fetchFirstText(urls)
      .then(txt=>{if(box){box.innerHTML=formatMarkdownDoc(txt);box.removeAttribute('aria-busy');docReadingReady(token);}})
      .catch(()=>{if(box)box.innerHTML='<p class="license-copy">The refund policy is temporarily unavailable. Please refresh the page, or contact support@bugit.dev.</p>';});
  }else if(r==='docs/commerce'){
    const box=document.getElementById('commerceText');
    // The heading and the intro line above this box are localized for every language, so
    // hard-wiring the BODY to English (as this did for everything except ja) produced a
    // page that opened in the reader's language and then switched to English for the
    // disclosure itself — the one part with legal weight. Every locale now has its own
    // TOKUSHOHO.<lang>.md and is loaded the same way as the license, privacy and refund
    // documents above, with English kept as the fallback so a missing file degrades to a
    // readable page rather than an error.
    const urls=lang==='en'?['/public/docs/TOKUSHOHO.md']:['/public/docs/TOKUSHOHO.'+lang+'.md','/public/docs/TOKUSHOHO.md'];
    fetchFirstText(urls)
      .then(txt=>{if(box){box.innerHTML=formatMarkdownDoc(txt);box.removeAttribute('aria-busy');docReadingReady(token);}})
      .catch(()=>{if(box)box.innerHTML='<p class="license-copy">This disclosure is temporarily unavailable. Please refresh the page, or contact support@bugit.dev.</p>';});
  }
  updateSkipTarget();
  window.scrollTo({top:0,behavior:'smooth'});
}
/* A fetch that lands after the reader has moved on must not rewrite the sidebar of the page
   they are now on. */
function docReadingReady(token){
  if(token!==docRenderToken)return;
  const lang=i18n[currentLang]?currentLang:'en';
  docBuildToc({...docUiText.en,...(docUiText[lang]||{})});
}
/* The skeleton that stands in for a document while it is being fetched.
   It is sized like the text it replaces, which is the point: an EMPTY box is short, and a
   short box pulls the footer up into the middle of the window for as long as the request
   takes -- then the text arrives and shoves it back down. Anyone clicking through the
   documentation saw that flash on every page. */
function docSkeleton(){
  const w=[92,86,96,74,90,82,94,68,88,90,78];
  return '<div class="doc-skel">'
    +'<span class="doc-skel-h"></span>'
    +w.map(n=>`<span style="width:${n}%"></span>`).join('')
    +'<span class="doc-skel-h"></span>'
    +w.slice(0,6).map(n=>`<span style="width:${n}%"></span>`).join('')
    +'</div>';
}
/* Everything the reading experience needs that cannot be written into the markup: the
   contents list is built from the document's own headings, and a document that is still
   being fetched has none yet. Rendered once now (for the pages whose text is already in the
   page: the FAQ, the support page, the index) and again by docReadingReady() when a fetch
   lands. A token guards it: click through three documents quickly and three fetches are in
   flight, and only the newest one is allowed to touch the sidebar. */
let docRenderToken=0;
/* WHICH SIDE THE CONTENTS LIST LIVES ON.

   Owner: "there is a large empty space in the right side of each body box which is unused in all
   the docs." There is: the document panel is 780px of content column and the prose is capped at
   its measure, because a line of 90 characters is not a line anybody reads. Filling that space
   with more text would fix the gap and break the reading; the space is not wasted, it is
   unoccupied, and what belongs in it is the thing every documentation site puts there.

   So above 1200px the contents list moves out of the left sidebar and into a sticky rail on the
   right, which is where a reader's eye goes to ask "where am I" without leaving the sentence.
   Below that there is no room for a third column, and it goes back to the sidebar exactly as
   before -- so the narrow layout is unchanged rather than newly compromised.

   REBUILDING ON THE BREAKPOINT IS SAFE BY CONSTRUCTION, because docBuildToc() begins by finding
   any existing list wherever it is, calling its __detach and removing it. That teardown already
   had to exist: every route change builds a new list, and without it the previous one's scroll
   listener would live on for the rest of the session reading a document that is no longer on
   the page. Crossing 1200px is just another rebuild. */
const DOC_TOC_WIDE = '(min-width:1200px)';
let docLastUi=null;
function docTocHost(){
  const wide=window.matchMedia&&window.matchMedia(DOC_TOC_WIDE).matches;
  const content=document.getElementById('docContent');
  if(!wide||!content) return document.getElementById('docNav');
  /* INSIDE the sheet, not beside it. Owner: "use the empty space in the right side of each box
     why are you leaving it empty?" A rail in a third layout column would have left the box
     itself exactly as empty; the space that is unoccupied is the panel's own, between the end of
     the measure and its right edge, so that is where the list goes.
     It is built rather than written into index.html because renderDocRoute() sets this element's
     innerHTML on every route change, which would delete a static child. Building it here means
     it cannot be orphaned and cannot be duplicated: the caller has already removed the previous
     one from wherever it was. */
  let rail=content.querySelector('.docs-toc-rail');
  if(!rail){ rail=document.createElement('aside'); rail.className='docs-toc-rail'; content.appendChild(rail); }
  return rail;
}
function docReadingUi(route,ui){
  docRenderToken++;
  docLastUi=ui;
  docBuildToc(ui);
  return docRenderToken;
}
if(window.matchMedia){
  const mq=window.matchMedia(DOC_TOC_WIDE);
  const onSide=()=>{ if(docLastUi&&!document.getElementById('docView').hidden) docBuildToc(docLastUi); };
  if(mq.addEventListener)mq.addEventListener('change',onSide); else if(mq.addListener)mq.addListener(onSide);
}
function docBuildToc(ui){
  const nav=docTocHost(),content=document.getElementById('docContent');
  if(!nav||!content)return;
  /* Wherever it is: the host changes with the viewport, so a lookup scoped to one of them
     would leave the other's list behind and run two scroll spies over one document. */
  document.querySelectorAll('#docView .doc-toc').forEach((o)=>{if(o.__detach)o.__detach();o.remove();});
  /* An empty rail is a reserved column with nothing in it, which is the thing being fixed. */
  document.querySelectorAll('#docContent .docs-toc-rail:empty').forEach((r)=>{ if(r!==nav) r.remove(); });
  // What divides THIS document: its headings, or -- for the licence, which has one heading
  // and fifteen numbered clauses -- its clauses.
  let heads=[...content.querySelectorAll('h2')];
  let labels=heads.map(h=>h.textContent.trim());
  if(heads.length<3){
    const clauses=[...content.querySelectorAll('.license-clause')];
    if(clauses.length>=3){
      heads=clauses;
      labels=clauses.map(c=>{
        const n=(c.querySelector('b')||{}).textContent||'';
        // The clause title is the text up to the first full stop, after the number.
        const rest=c.textContent.slice(n.length).trim();
        const stop=rest.search(/[.。．]/);
        let title=stop>0?rest.slice(0,stop):rest;
        if(title.length>44)title=title.slice(0,42).trim()+'\u2026';
        return (n?n+' ':'')+title;
      });
    }
  }
  // Two sections are a document you can see the whole of; a contents list would be noise.
  if(heads.length<3){
    const empty=document.querySelector('#docContent .docs-toc-rail');
    if(empty&&!empty.children.length)empty.remove();
    return;
  }
  heads.forEach((h,i)=>{if(!h.id)h.id='doc-sec-'+(i+1);});
  const toc=document.createElement('nav');
  toc.className='doc-toc';
  toc.setAttribute('aria-label',ui.onThisPage);
  toc.innerHTML='<span class="doc-toc-h">'+escapeHtml(ui.onThisPage)+'</span><ol>'
    +heads.map((h,i)=>`<li><a href="#${h.id}">${escapeHtml(labels[i])}</a></li>`).join('')
    +'</ol>';
  nav.appendChild(toc);
  // Clicking a contents entry must not change the ROUTE. These are ids inside the document,
  // and the hash is the router: writing #doc-sec-4 into it would be read as an unknown SPA
  // route and answer with the not-found page.
  toc.addEventListener('click',e=>{
    const a=e.target.closest('a');if(!a)return;
    e.preventDefault();
    const el=document.getElementById(a.getAttribute('href').slice(1));
    if(!el)return;
    /* Mark it before scrolling, not after: the scroll is animated, and an entry that lights up
       half a second after it was pressed reads as a page that did not hear you. */
    if(toc.__pin)toc.__pin([...toc.querySelectorAll('a')].indexOf(a));
    el.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
  docSpy(toc,heads);
}
/* Which section is being read. Driven by the scroll position rather than by intersection
   events: the last section of a document is often shorter than the window, so its heading
   never crosses a line partway down the viewport and no event ever arrives for it -- the
   entry simply could not be reached. Reaching the bottom of the page IS reading the last
   section, and that case is now stated outright. Throttled to one read per frame. */
function docSpy(toc,heads){
  const links=[...toc.querySelectorAll('a')];
  let raf=0,cur=-1;
  const mark=i=>{
    if(i===cur)return;
    cur=i;
    links.forEach((a,j)=>{
      a.classList.toggle('is-current',j===i);
      if(j===i)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');
    });
  };
  const read=()=>{
    raf=0;
    if(pinned>=0){ mark(pinned); return; }
    /* The reading line is 170px down the window for most of a document, and slides to the
       bottom of the window across the final screenful. Clamping to the last entry at the
       bottom instead -- which is what this did first -- makes the list JUMP: on the licence
       the last three clauses share the closing screen, so it went 12, then straight to 15.
       Sliding the line means each of them is current while it is the one being read, and the
       last entry is still reachable, which a fixed line can never manage. */
    const doc=document.documentElement;
    const rest=Math.max(0,(doc.scrollHeight-window.innerHeight)-window.scrollY);
    const tail=window.innerHeight;
    const line=rest<tail?170+(tail-170)*(1-rest/tail):170;
    let i=0;
    heads.forEach((h,n)=>{if(h.getBoundingClientRect().top<=line)i=n});
    mark(i);
  };
  const onScroll=()=>{if(!raf)raf=requestAnimationFrame(read)};
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll,{passive:true});
  /* A CHOICE BEATS A GUESS. Owner: "sometimes when i click on a topic i want it doesnt get
     highlighted and takes me to another point instead."

     Everything above infers which section is being read from where the page is, and it has to:
     while somebody scrolls, that is the only information there is. A CLICK is different -- it is
     the reader saying which section they want, and inferring over the top of that can only ever
     disagree with them. It did, reliably, near the end of a document: the reading line slides to
     the bottom of the window across the final screenful (so the last entries are reachable while
     reading), and the last few clauses of the licence share that screen. Click clause 13 and the
     page scrolls as far as it can, which is the bottom, and the line then finds clause 15 above
     it. The scroll went to the right place; the highlight did not follow.

     So a click PINS its entry, and only a gesture the reader makes releases it -- wheel, touch,
     a key, a press on the scrollbar. A programmatic smooth scroll fires `scroll` and nothing
     else, which is exactly the distinction needed: the animation cannot un-choose what the
     reader just chose, and the first real scroll afterwards hands the list back to the spy. */
  let pinned=-1;
  const unpin=()=>{ if(pinned<0)return; pinned=-1; onScroll(); };
  /* WHICH GESTURES MEAN "I AM MOVING THE PAGE MYSELF", and this list was wrong once in a way
     worth writing down. Owner: "when i click on 13 and hold the mouse button down 15 gets
     highlighted."

     The first version released the pin on `mousedown`, and a click is a mousedown followed some
     time later by a click -- as long as the reader holds the button, that is exactly the window
     where the previous pin has been dropped and the new one has not been set. `read()` runs in
     that window, the sliding reading line at the foot of a document finds the last clause above
     it, and entry 15 lights up until the button comes back up. Pressing INSIDE the contents list
     is never someone scrolling; it is someone choosing.

     `keydown` had the same shape for a keyboard: Enter on a focused entry is a keydown, so it
     released the pin a frame before the click set it.

     So a press releases the pin only when it lands somewhere else -- in the document, or on the
     scrollbar, which is the one way to scroll that fires no gesture of its own -- and a key
     releases it only if it is a key that scrolls and focus is not in the list. Wheel and touch
     always release: neither can be part of choosing an entry. */
  const SCROLL_KEYS=new Set(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Spacebar']);
  const outside=(e)=>!(e.target&&toc.contains(e.target));
  const onWheel=()=>unpin();
  const onPress=(e)=>{ if(outside(e))unpin(); };
  const onKey=(e)=>{ if(outside(e)&&SCROLL_KEYS.has(e.key))unpin(); };
  const GESTURES=[['wheel',onWheel],['touchmove',onWheel],['mousedown',onPress],['keydown',onKey]];
  GESTURES.forEach(([ev,fn])=>addEventListener(ev,fn,{passive:true}));
  toc.__pin=(i)=>{ pinned=i; mark(i); };
  /* Every route change builds a new list; without this the old one's listener would live on
     for the rest of the session, reading a document that is no longer on the page. */
  toc.__detach=()=>{removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);
    GESTURES.forEach(([ev,fn])=>removeEventListener(ev,fn));};
  read();
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
/* THE ONE TAG THE DOC SOURCES ARE ALLOWED TO CARRY, and it is not a convenience.
   Arabic is written right to left, and a Latin run inside it ("VS Code", "python
   tools/connect.py jira", "BugIt Portal") has no direction of its own, so the bidi
   algorithm attaches it to whatever surrounds it and the words come out in the wrong
   order. <bdi dir="ltr"> is the standard fix and the Arabic sources use it 194 times.
   Every one of them was ESCAPED by escapeHtml above and printed as visible tag text:
   the reader saw "bdi>" in the middle of sentences on all six documentation routes,
   in the license, the privacy statement and the commercial disclosure among them.
   Found by the 2026-08-17 external audit (F-05).
   Restoring it AFTER escaping, by name, is what keeps this a one-tag allowlist rather
   than raw HTML: the content between the tags is still escaped text, nothing else is
   un-escaped, and there is no attribute to inject into -- the open tag is matched and
   re-emitted literally, dir="ltr" and all. Stripping the tags instead would hide the
   symptom and bring back the ordering bug they were added to solve.
   Matched as a PAIR, never as two independent tags. Un-escaping every closing tag on
   sight leaves a stray one behind whenever its opening tag was not the allowed
   spelling, which is broken markup produced by the very function meant to prevent it. */
function allowBdi(s){
  return String(s).replace(
    /&lt;bdi dir=(?:&quot;|')ltr(?:&quot;|')&gt;([\s\S]*?)&lt;\/bdi&gt;/g,
    '<bdi dir="ltr">$1</bdi>');
}
/* The licence is plain text, but the ten translated copies open with the machine-translation
   disclaimer written as `**Avertissement sur la traduction.**` -- and this renderer escaped it
   and printed the asterisks. Ten legal pages, every one of them showing raw markup in its first
   sentence, while PRIVACY, REFUND and TOKUSHOHO rendered the identical disclaimer as bold
   because THEY go through formatMarkdownDoc. Two renderers, one corpus, one of them deaf to
   the markup the corpus actually uses. So this one now honours the same inline rules; the
   sources keep their markers, which is what makes them portable between the two. */
function licenseInline(s){
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
}
function formatLicense(txt){
  const blocks=txt.replace(/\r\n/g,'\n').split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  return blocks.map((b,i)=>{
    if(i===0){const l=b.split('\n');return `<h2 class="license-title">${allowBdi(licenseInline(l[0]))}</h2>`+(l[1]?`<p class="license-copy">${allowBdi(licenseInline(l.slice(1).join(' ')))}</p>`:'');}
    const m=b.match(/^(\d+)\.\s/);
    if(m)return `<p class="license-clause"><b>${m[1]}.</b> ${allowBdi(licenseInline(b.replace(/^\d+\.\s/,''))).replace(/\n/g,' ')}</p>`;
    return `<p>${allowBdi(licenseInline(b)).replace(/\n/g,' ')}</p>`;
  }).join('');
}
/* Lightweight Markdown renderer for themed doc pages (privacy statement). Handles
   # / ## headings, - bullet lists, links, **bold** and `code`. Continuation lines within
   a bullet/paragraph are joined; blank lines separate blocks. */
function formatMarkdownDoc(txt){
  const inline=s=>escapeHtml(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(_match,label,href)=>
      /^(?:https?:\/\/|mailto:|\/|#)[^\s"'<>]+$/.test(href)?`<a href="${href}">${label}</a>`:label)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
  // Last, so the bold/code/link rules above still run on the text INSIDE a <bdi>: the
  // Arabic sources wrap inline code in it (`<bdi dir="ltr">`python tools/connect.py`</bdi>`),
  // and a command that renders as prose is a command a reader cannot recognise.
  const line=s=>allowBdi(inline(s));
  /* A HEADING IS ITS OWN BLOCK, whether or not the author left a blank line after it. Blocks are
     split on blank lines, so `## Known limits` followed immediately by its bullets arrived here as
     ONE block, matched the heading branch, and the entire list was emitted inside the <h2>. The
     markers then printed as text, which is how it was found. Normalising the source so a heading
     line always stands alone costs one pass and removes the whole class. */
  const src=txt.replace(/\r\n/g,'\n')
    .replace(/([^\n])\n(#{1,6}\s)/g,'$1\n\n$2')
    .replace(/(^|\n)(#{1,6}\s[^\n]*)\n(?!\n)/g,'$1$2\n\n');
  const blocks=src.split(/\n\s*\n/)
    .map(b=>b.replace(/\n[ \t]+/g,' ').trim()).filter(Boolean);
  let out='';
  for(const b of blocks){
    if(/^#\s+/.test(b))continue; // top-level title is already shown as the page H1
    if(/^###\s+/.test(b)){out+=`<h3 class="license-subtitle">${line(b.replace(/^###\s+/,''))}</h3>`;continue;}
    if(/^##\s+/.test(b)){out+=`<h2 class="license-title">${line(b.replace(/^##\s+/,''))}</h2>`;continue;}
    const lines=b.split('\n');
    /* BLOCKQUOTES. Every translated document opens with the machine-translation notice, and it
       is written as one: `> **Hinweis zur Uebersetzung.** ...`. Nothing here handled it, so the
       marker fell straight through to the paragraph branch and printed. Fifty documents -- ten
       languages of PRIVACY, GETTING_STARTED and OVERVIEW -- each showed a stray `>` in front of
       the one paragraph that tells a reader which version of a legal text actually governs.
       Rendered now as what it is: a note, set apart from the document it introduces. */
    if(lines.every(l=>/^>\s?/.test(l))){
      out+=`<blockquote class="doc-note">${line(lines.map(l=>l.replace(/^>\s?/,'')).join(' '))}</blockquote>`;
      continue;
    }
    /* ORDERED LISTS. There was no branch for them at all, so a numbered checklist fell through
       to the paragraph branch and printed its own numbers as prose. */
    if(lines.every(l=>/^\d+\.\s+/.test(l))){
      out+='<ol class="license-list">'+lines.map(l=>`<li>${line(l.replace(/^\d+\.\s+/,''))}</li>`).join('')+'</ol>';
      continue;
    }
    if(lines.every(l=>/^[-*]\s+/.test(l))){
      out+='<ul class="license-list">'+lines.map(l=>`<li>${line(l.replace(/^[-*]\s+/,''))}</li>`).join('')+'</ul>';
      continue;
    }
    out+=`<p>${line(b.replace(/\n/g,' '))}</p>`;
  }
  return out;
}
function initDemo(){
  const stack=document.getElementById('demoStack');
  if(!stack) return;
  const vids=[...stack.querySelectorAll('.demo-video')];
  const tabs=[...document.querySelectorAll('.demo-tabs button')];
  if(!vids.length) return;
  const order=vids.map(v=>v.dataset.video);
  const rm=window.matchMedia('(prefers-reduced-motion: reduce)');
  let cur=0, visible=false;
  const safePlay=v=>{try{const p=v.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}};

  // Cross-fade to clip i. Only the incoming clip is reset to frame 0, so the
  // outgoing clip holds its last frame while it fades (no jump, no flash).
  function show(i,restart){
    cur=i;
    // Active clip is visible + in the a11y tree + focusable; inactive clips are
    // paused, hidden from assistive tech, and out of the keyboard order.
    vids.forEach((v,idx)=>{const on=idx===i;v.classList.toggle('is-active',on);if(!on)v.pause();
      v.setAttribute('aria-hidden',on?'false':'true');v.tabIndex=on?0:-1;});
    tabs.forEach(b=>{const on=b.dataset.video===order[i];b.classList.toggle('active',on);
      b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;});
    if(restart!==false){try{vids[i].currentTime=0;}catch(e){}}
    if(visible)safePlay(vids[i]);
  }

  // PHONE-SHAPED CLIPS. The landscape clips are 1120x630 (the branded one 1920x1080).
  // In this frame on a 390px screen they render ~358px wide, so their UI text lands at
  // about 4.5px and cannot be read — the clip plays and communicates nothing. Each video
  // therefore carries a 720x1280 data-portrait cut, swapped in below the SAME 760px
  // breakpoint the stylesheet uses. Assigning src restarts playback, so this only runs
  // when the breakpoint actually changes, never on every resize event.
  const portraitMQ=window.matchMedia('(max-width:760px)');
  let usingPortrait=null;
  function applySources(){
    const want=portraitMQ.matches;
    if(want===usingPortrait)return;
    usingPortrait=want;
    vids.forEach((v,idx)=>{
      const src=want?v.dataset.portrait:v.dataset.landscape;
      if(!src||v.getAttribute('src')===src)return;
      v.setAttribute('src',src);
      if(idx===cur&&visible)safePlay(v);
    });
  }
  portraitMQ.addEventListener?.('change',applySources);

  // HOLD THE LAST FRAME BEFORE ADVANCING. Each clip spends its whole runtime building up
  // to the finished report, and rotation used to start the instant it arrived — so the
  // one thing the section exists to show was the one thing you never got to read.
  const HOLD_MS=3400;
  let holdTimer=null;
  const cancelHold=()=>{if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}};
  vids.forEach((v,idx)=>{
    v.loop=false;
    v.addEventListener('ended',()=>{
      if(rm.matches||idx!==cur)return;
      cancelHold();
      holdTimer=setTimeout(()=>{holdTimer=null;if(idx===cur&&visible)show((cur+1)%vids.length);},HOLD_MS);
    });
  });

  // Tabs jump to a demo; rotation then continues from there. A pending hold belongs to
  // the clip the viewer just left, so it is dropped rather than firing over the new one.
  tabs.forEach(btn=>btn.addEventListener('click',()=>{const i=order.indexOf(btn.dataset.video);if(i>=0){cancelHold();show(i);}}));

  // ARIA tablist keyboard pattern: Arrow/Home/End move roving focus between tabs
  // and activate the focused demo.
  const tablist=document.querySelector('.demo-tabs');
  tablist&&tablist.addEventListener('keydown',e=>{
    const idx=tabs.indexOf(document.activeElement);
    if(idx<0)return;
    let n=null;
    if(e.key==='ArrowRight'||e.key==='ArrowDown')n=(idx+1)%tabs.length;
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=(idx-1+tabs.length)%tabs.length;
    else if(e.key==='Home')n=0;
    else if(e.key==='End')n=tabs.length-1;
    if(n!==null){e.preventDefault();tabs[n].focus();const i=order.indexOf(tabs[n].dataset.video);if(i>=0){cancelHold();show(i);}}
  });

  // Don't decode/play the clips while the section is off-screen (perf + battery).
  new IntersectionObserver(es=>es.forEach(e=>{visible=e.isIntersecting;if(visible)safePlay(vids[cur]);else{cancelHold();vids[cur].pause();}}),{threshold:.25}).observe(stack);

  // Reduced motion: no auto-rotation, no fades — show only the first clip (looping).
  function apply(){applySources();vids.forEach((v,idx)=>{v.loop=rm.matches&&idx===0;});show(rm.matches?0:cur,false);}
  rm.addEventListener?.('change',apply);
  apply();
}
/* Mobile docs-nav disclosure. Delegated on the persistent #docNav aside (its innerHTML
   is rebuilt each route, but the element itself is not), so this binds once. Toggling
   only sets the .open class; the CSS handles show/hide. Desktop ignores it (toggle is
   display:none and the list is always visible). Selecting a page closes the menu, and
   renderDocRoute() already re-renders collapsed and scrolls to the top of the document. */
/* Phone-only disclosure for the long report body, so Mission Control's two halves
   (what BugIt learned, and the report that came out of it) fit on one screen.

   Whether it applies at all is decided by the STYLESHEET rather than by a second
   copy of the 760px breakpoint here: the toggle is display:none above 760px, so on
   desktop `applies()` is false and the report is simply never collapsed. That also
   means the report stays fully visible if this script never runs.

   The label is swapped by rewriting data-t, not textContent, so a language change
   re-renders the correct word for the state it is actually in. */
/* Set once, by the instrument, the first time a run completes. On the window rather than in
   a closure because the run and the disclosure are initialised separately and neither owns
   the other; a one-way latch is safe to share. */
window.__reportReady=function(){
  if(window.__reportIsReady)return;
  window.__reportIsReady=true;
  var b=document.getElementById('reportMoreToggle');
  if(b){b.removeAttribute('aria-disabled');b.classList.add('is-ready');}
  var p=document.querySelector('.report-panel');
  if(p)p.classList.add('is-ready');
};
/* A NEW REPORT IS A NEW DECISION. The instrument writes a different bug on every cycle, so an
   open panel would be showing one bug's summary above another bug's analysis while the text
   was replaced under the reader. The panel closes, the control goes back to unavailable, and
   it offers itself again when the new report is finished. */
window.__reportRestart=function(){
  window.__reportIsReady=false;
  var b=document.getElementById('reportMoreToggle');
  if(b){b.setAttribute('aria-disabled','true');b.classList.remove('is-ready');}
  var p=document.querySelector('.report-panel');
  if(p)p.classList.remove('is-ready');
  if(window.__reportClose)window.__reportClose();
};
function initReportDisclosure(){
  const panel=document.querySelector('.report-panel');
  const btn=document.getElementById('reportMoreToggle');
  if(!panel||!btn)return;
  let open=false;
  const applies=()=>getComputedStyle(btn).display!=='none';
  /* Armed means the instrument is going to run; unarmed (reduced motion, or no script on the
     mission at all) means the report is already whole, so there is nothing to wait for. */
  if(panel.closest('.mission')&&panel.closest('.mission').classList.contains('mc-armed')&&!window.__reportIsReady){
    /* aria-disabled rather than disabled: the control stays in the tab order and stays
       announced, and the handler below declines the press. A disabled button is invisible to
       the keyboard, which is the wrong answer for a state that lasts seven seconds. */
    btn.setAttribute('aria-disabled','true');
  }else{
    btn.classList.add('is-ready');
    panel.classList.add('is-ready');
    window.__reportIsReady=true;
  }
  /* The open panel scrolls inside the height it already has, so opening it moves nothing on
     the page. That height is the one the layout chose for the collapsed panel -- measured,
     never guessed, because it is whatever the headline column beside it works out to. Only
     measured while closed, for the obvious reason. */
  function measure(){
    if(open)return;
    /* The class, not just the flag. `open` is flipped by the click handler BEFORE render()
       runs, so on the press that CLOSES the panel the flag says closed while the element is
       still `is-open` -- and the height read there is the open one, which is what this panel
       was being pinned to. The DOM cannot disagree with itself. */
    if(panel.classList.contains('is-open'))return;
    /* THE LAYOUT HEIGHT, NOT THE PROJECTED ONE, and this is the whole of a defect that read as
       the box growing 7px when the report was opened, in Korean and Chinese and nowhere else.
       `.mission` settles under a matrix3d with a small rotateX and a perspective term, and
       getBoundingClientRect() returns the PROJECTED quad -- 534.6px for a panel whose layout
       height is 527. That number then became a max-height, which is a layout property, so the
       panel was handed 7.6px it did not have and the instrument grew into it. It looked
       language-specific because it is a race: the settle finishes at different moments in
       different languages, and only a press that lands before it finishes reads a tilted box.
       `getComputedStyle().height` is the used value, in the element's own box and immune to any
       transform on an ancestor; with box-sizing:border-box it already includes the padding and
       the border, so it is the same number the rect reports once the tilt is gone. Falling back
       to the rect keeps the old behaviour if a browser ever hands back a keyword. */
    const used=parseFloat(getComputedStyle(panel).height);
    const h=isFinite(used)&&used>0?used:panel.getBoundingClientRect().height;
    /* FLOOR, not round: round can return half a pixel MORE than the panel has, and this
       number becomes a max-height, so half a pixel too much is half a pixel of growth. */
    if(h>320)panel.style.setProperty('--report-h',Math.floor(h)+'px');
  }
  function render(){
    panel.classList.toggle('is-collapsed',applies()&&!open);
    panel.classList.toggle('is-open',applies()&&open);
    if(open)panel.scrollTop=0;
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.dataset.t=open?'report.hideFull':'report.showFull';
    const v=get(i18n[currentLang]||i18n.en,btn.dataset.t);
    if(v!==undefined)btn.textContent=v;
    /* LAST, not first. Measuring before the classes are applied reads whichever state the
       panel is leaving rather than the one it is entering. */
    measure();
  }
  btn.addEventListener('click',()=>{
    if(btn.getAttribute('aria-disabled')==='true')return;   // still being written
    /* PIN IT HERE, one statement before it is used. The owner's rule is that the box stays the
       size it is, and "the size it is" is a fact about this instant: the instrument rewrites
       the report on a loop, a web font swap moved it 13.8px half a second after load, and
       arming the mission changes it again. Every version of this that measured EARLIER --
       at init, on a double rAF, after fonts.ready, from a ResizeObserver -- was measuring a
       height the panel no longer had by the time the reader pressed the button, and the panel
       grew into the difference. Reading it on the press cannot be out of date.
       Only when OPENING: on the way back the panel returns to its natural height and there is
       nothing to freeze. */
    if(!open)measure();
    open=!open;render();
  });
  /* Closed from outside, by the instrument, when it starts writing the next report. */
  window.__reportClose=function(){ if(open){open=false;render();} };
  window.addEventListener('resize',render,{passive:true});
  /* The height this panel is pinned to is only correct until something moves. The instrument
     rewrites the report on a twenty-five second loop, a late web font shifts every block in it,
     and a stylesheet change can alter how many lines a heading reserves -- measured at 1024px
     the cap was 13.2px larger than the panel, and the box grew by exactly that on every press.
     Watching the panel is the only version of this that cannot go stale.
     No feedback loop: --report-h does nothing while the panel is closed, so writing it here
     cannot resize the element being observed. */
  /* THE REFERENCE IS LOAD-BEARING. A ResizeObserver with no strong reference is collectable,
     and a collected observer simply stops calling back -- silently, and only sometimes, which
     is the worst way for this to fail. The first version of this line was
     `new ResizeObserver(...).observe(panel)` and it never fired: measured at 1024px the panel
     settled from 689.3px to 675.5px half a second after load, when the web font replaced the
     fallback, and the cap stayed on 689. Every press then grew the box by the 13.5px
     difference. */
  if(window.ResizeObserver){
    panel.__reportRO=new ResizeObserver(function(){ if(!open) measure(); });
    panel.__reportRO.observe(panel);
  }
  render();
  /* One more read after the fonts have settled: a fallback face is a different height, and
     the number this panel is pinned to has to be the one the finished page is using. */
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
  requestAnimationFrame(()=>requestAnimationFrame(measure));
}
function initDocNav(){
  const dn=document.getElementById('docNav');if(!dn)return;
  const close=()=>{dn.classList.remove('open');const t=dn.querySelector('.docs-nav-toggle');if(t)t.setAttribute('aria-expanded','false');};
  dn.addEventListener('click',e=>{
    const toggle=e.target.closest('.docs-nav-toggle');
    if(toggle){const open=dn.classList.toggle('open');toggle.setAttribute('aria-expanded',open?'true':'false');return;}
    if(e.target.closest('.docs-nav-list a'))close();
  });
  dn.addEventListener('keydown',e=>{if(e.key==='Escape'&&dn.classList.contains('open')){const t=dn.querySelector('.docs-nav-toggle');close();if(t)t.focus();}});
}
/* Mobile navigation overlay. Full-screen + body scroll-lock so it never overlays
   content while the page scrolls. Closes on link select / Escape / resize to
   desktop; focus moves in on open and returns to the toggle on close, with a
   lightweight Tab trap while open. */
function initMobileNav(){
  const toggle=document.getElementById('navToggle');
  const menu=document.getElementById('mobileMenu');
  const closeBtn=document.getElementById('navClose');
  if(!toggle||!menu)return;
  const isOpen=()=>menu.classList.contains('open');
  /* Everything the overlay covers, EXCEPT the toggle that closes it.
     
     THE TOGGLE LIVES INSIDE THE HEADER, AND THE HEADER IS BEHIND THE OVERLAY. The first version
     of this inerted every body child except the menu, which included the <header> the hamburger
     sits in -- and `inert` is inherited and cannot be undone by a descendant. So opening the
     menu removed its own close button from hit-testing: the button still looked pressable, still
     said aria-label="Close menu", and did nothing at all. Reproduced on the second tap in
     Chromium, in real Chrome and in WebKit; Playwright had to pass force:true to land it, which
     is exactly what a real finger cannot do. With the page scroll-locked behind it, a visitor is
     left tapping a dead control on a frozen page.

     So inert SIBLINGS ALONG THE PATH instead of whole subtrees: walk from each element that must
     stay live up to <body>, and at every level inert the siblings that are not on a keep-path.
     The header itself stays interactive, its other contents (logo, language, account) do not,
     and the toggle keeps working. Computed each time rather than captured once, so a section
     added to the page later is covered without anyone remembering this line exists. */
  const keepLive=()=>[menu,toggle];
  const onKeepPath=()=>{
    const set=new Set();
    keepLive().forEach(el=>{ for(let n=el;n&&n!==document.body;n=n.parentElement)set.add(n); });
    return set;
  };
  const behind=()=>{
    const keep=onKeepPath(),out=[];
    const walk=el=>{
      for(const child of el.children){
        if(child.tagName==='SCRIPT')continue;
        if(keep.has(child)){ walk(child); }        // on the path: descend, do not inert
        else out.push(child);                       // off the path: inert the whole subtree
      }
    };
    walk(document.body);
    return out;
  };
  let savedY=0;
  const open=()=>{
    // iOS-safe scroll lock: overflow:hidden alone does not lock the document on
    // iOS Safari (and can lose the offset). Freeze the body at its current offset
    // with position:fixed + top:-Y so the background cannot scroll and no layout
    // shift occurs; restore the exact offset on close.
    savedY=window.scrollY||window.pageYOffset||0;
    menu.classList.add('open');document.body.classList.add('menu-open');
    document.body.style.top=`-${savedY}px`;
    toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close menu');
    // The Tab trap below is correct, but a screen reader browses the document rather than
    // tabbing through it: behind this overlay the whole page stayed readable. `inert` is the
    // only thing that removes a subtree from BOTH the tab order and the accessibility tree.
    behind().forEach(el=>el.setAttribute('inert',''));
    const first=menu.querySelector('a,button');if(first)first.focus({preventScroll:true});
  };
  const close=()=>{
    menu.classList.remove('open');document.body.classList.remove('menu-open');
    document.body.style.top='';
    window.scrollTo({top:savedY,left:0,behavior:'instant'});
    toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');
    // Un-inert BEFORE returning focus: focusing an element inside an inert subtree does nothing
    // at all, and the reader would be left on <body> with no idea the menu had closed.
    behind().forEach(el=>el.removeAttribute('inert'));
    toggle.focus({preventScroll:true});
  };
  toggle.addEventListener('click',()=>isOpen()?close():open());
  if(closeBtn)closeBtn.addEventListener('click',close);
  menu.addEventListener('click',e=>{if(e.target.closest('a'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen())close();});
  window.addEventListener('resize',()=>{if(window.innerWidth>1320&&isOpen())close();});
  menu.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const f=menu.querySelectorAll('a,button');if(!f.length)return;
    const first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
}
/* Authenticated account state. Reflects the REAL portal/Supabase session via a
   read-only, CORS-restricted status endpoint on portal.bugit.dev — never a
   marketing-only auth flag, never localStorage, never a token. Cookies (sb-*)
   ride along on the same-site credentialed fetch; the endpoint returns only
   { authenticated, name, dashboardUrl }. Fails gracefully to "Sign in". */
var PORTAL_ORIGIN='https://portal.bugit.dev';
function acctLinks(){return [['dashboard','/dashboard'],['licenses','/dashboard/license'],['downloads','/dashboard/downloads'],['settings','/dashboard/account']];}
function acctListHtml(){var items=acctLinks().map(function(it){return '<a href="'+PORTAL_ORIGIN+it[1]+'" role="menuitem" data-t="account.'+it[0]+'"></a>';}).join('');var so='<form method="POST" action="'+PORTAL_ORIGIN+'/api/signout"><button type="submit" class="acct-signout" role="menuitem" data-t="account.signout"></button></form>';return items+so;}
/* THE ACCOUNT MENU IS THE OTHER DECLARED MENU, and until 2026-08-21 it kept none of the
   promise: opening it moved focus nowhere, the arrows did nothing, all five rows sat in the tab
   order, and selecting one dropped the `open` class WITHOUT syncing aria-expanded, so the button
   went on reporting itself expanded over a closed menu. The audit named the language menus;
   this one was the same defect standing beside them, on the surface every signed-in customer
   uses. It now shares the language menu's keyboard implementation rather than a copy of it. */
function initAcctMenu(){
  var menu=document.getElementById('acctMenu'),btn=document.getElementById('acctButton'),list=document.getElementById('acctList');
  if(!menu||!btn||btn.dataset.ready)return;
  btn.dataset.ready='1';
  var sync=function(){btn.setAttribute('aria-expanded',menu.classList.contains('open')?'true':'false')};
  /* Queried live, never captured: renderAccount() rewrites these rows whenever the session or
     the language changes, so a list captured at wiring time would be pointing at dead nodes. */
  var items=function(){return [].slice.call(list.querySelectorAll('[role="menuitem"]'))};
  var rove=function(el){items().forEach(function(b){b.tabIndex=b===el?0:-1});if(el)el.focus()};
  var current=function(){return items()[0]};
  /* `void list.offsetHeight` for the same reason as the language menu: the panel is display:none
     until `.open` lands, and focus() on a display:none element is a no-op that reports nothing. */
  var open=function(focus){
    menu.classList.add('open');sync();void list.offsetHeight;
    items().forEach(function(b){b.tabIndex=-1});
    if(focus!==false)rove(current());
  };
  var close=function(giveBack){
    if(!menu.classList.contains('open'))return;
    menu.classList.remove('open');sync();
    items().forEach(function(b){b.tabIndex=-1});
    if(giveBack)btn.focus();
  };
  /* POINTER BEHAVIOUR IS UNCHANGED: a mouse open moves no focus. The rows still leave the tab
     order, so the menu is ONE tab stop rather than five, and ArrowDown from the button walks in. */
  btn.onclick=function(){menu.classList.contains('open')?close(false):open(false)};
  list.addEventListener('click',function(e){if(e.target.closest('a,button'))close(false)});
  document.addEventListener('click',function(e){if(!menu.contains(e.target))close(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.classList.contains('open'))close(true)});
  wireMenuKeyboard({btn:btn,list:list,items:items,rove:rove,current:current,
    isOpen:function(){return menu.classList.contains('open')},open:open,close:close});
}
function renderAccount(name){var slot=document.getElementById('authSlot'),list=document.getElementById('acctList'),label=document.getElementById('acctLabel');if(list)list.innerHTML=acctListHtml();if(label){if(name){label.textContent=name;label.removeAttribute('data-t');}else{label.setAttribute('data-t','account.myAccount');}}var mm=document.getElementById('mmAcct');if(mm){mm.innerHTML=acctListHtml();if(name){var nm=document.createElement('div');nm.className='mm-acct-name';nm.textContent=name;mm.insertBefore(nm,mm.firstChild);}mm.hidden=false;}var ms=document.querySelector('.mm-signin');if(ms)ms.hidden=true;if(slot)slot.dataset.state='in';applyLang(currentLang);initAcctMenu();}
function renderSignedOut(){var slot=document.getElementById('authSlot');if(slot)slot.dataset.state='out';var mm=document.getElementById('mmAcct');if(mm){mm.hidden=true;mm.innerHTML='';}var ms=document.querySelector('.mm-signin');if(ms)ms.hidden=false;}
function initAuth(){var slot=document.getElementById('authSlot');if(slot)slot.dataset.state='loading';var ctrl=('AbortController'in window)?new AbortController():null;var timer=ctrl?setTimeout(function(){try{ctrl.abort()}catch(e){}},4000):null;fetch(PORTAL_ORIGIN+'/api/session-status',{credentials:'include',signal:ctrl?ctrl.signal:undefined,headers:{'accept':'application/json'}}).then(function(r){return r.ok?r.json():Promise.reject()}).then(function(d){if(timer)clearTimeout(timer);if(d&&d.authenticated){renderAccount(d.name||null)}else{renderSignedOut()}}).catch(function(){if(timer)clearTimeout(timer);renderSignedOut()});}
/* With manual scroll restoration, position the initial view ourselves so a
   refresh (incl. iOS pull-to-refresh) never lands on a stale/bottom position.
   Honor a genuine in-page anchor (#features …); a doc route (#/…) is scrolled to
   top by renderDocRoute; anything else starts at the top (hero). Instant, so
   there is no visible scroll animation on load. */
/* WHERE AN IN-PAGE ANCHOR SHOULD LAND.
   A section marked `data-land` says which element the reader actually came to see -- the film
   player, the demo tabs -- because those sections open with an eyebrow, a heading and a
   subtitle, so landing on the section shows the label rather than the thing. Everything else
   keeps the browser's own behaviour, which is right when the first line IS the point. */
function landOn(section, smooth){
  /* The SECTION names its landing child by selector. An earlier version looked for any
     descendant carrying [data-land], which is true of every ancestor as well -- so the skip
     link, whose target is <main>, found the film player inside it and scrolled a keyboard user
     into the middle of the page instead of to the top of the content. */
  const sel=section.dataset?section.dataset.land:null;
  const focus=sel?section.querySelector(sel):null;
  const behavior=(smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches)?'smooth':'instant';
  if(focus){focus.scrollIntoView({behavior:behavior,block:'center'});return true}
  section.scrollIntoView({behavior:behavior,block:'start'});
  return false;
}
document.addEventListener('click',function(e){
  const a=e.target&&e.target.closest?e.target.closest('a[href^="#"]'):null;
  if(!a)return;
  const href=a.getAttribute('href');
  if(!href||href==='#'||href.startsWith('#/'))return;
  const sec=document.getElementById(href.slice(1));
  /* Only take over for a section that NAMES a landing target on itself; otherwise leave the
     browser alone, so the header offset, the skip link and the focus behaviour are untouched. */
  if(!sec||!sec.dataset||!sec.dataset.land)return;
  e.preventDefault();
  if(location.hash!==href){history.pushState(null,'',href);}
  landOn(sec,true);
});
function initInitialScroll(){
  const h=location.hash;
  if(h && !h.startsWith('#/')){
    const anchor=document.getElementById(h.slice(1));
    if(anchor){landOn(anchor,false);return;}
  }
  if(!h.startsWith('#/')) window.scrollTo({top:0,left:0,behavior:'instant'});
}
// Mission Control — a continuously-processing "AI QA engineer" simulation. One
// delta-time clock drives the workflow rows, the progress bar, the streaming result
// line and the progressive assembly of the report; the finished report is then held
// on screen for ~10s (long enough to read) before a slow ~0.8s fade rebuilds a fresh,
// slightly-varied analysis. The window frame never moves — only its content changes.
// Pauses entirely on hover/focus so visitors can inspect the report, and while the
// mission is scrolled out of view. Disabled for reduced-motion / no-JS (static result).
function initMission(){
  var mission=document.querySelector('.mission'); if(!mission) return;
  var panel=mission.querySelector('.status-panel'); if(!panel) return;
  var report=mission.querySelector('.report-panel');
  var items=[].slice.call(panel.querySelectorAll('li'));
  var steps=items.slice(0,7);
  var awaitLi=panel.querySelector('li.awaiting');
  var bar=mission.querySelector('.report-progress i');
  var pct=mission.querySelector('.report-pct');
  var stream=mission.querySelector('.mc-stream');
  var streamLine=mission.querySelector('.mc-line');
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function q(sel){return report.querySelector(sel);}
  function qa(sel){return [].slice.call(report.querySelectorAll(sel));}
  var h2=q('h2'), h3s=qa('h3'), ps=qa('p'), pre=q('pre'),
      metaC=qa('.report-meta>div'), metaB=metaC.map(function(c){return c.querySelector('b');}),
      metaBox=q('.report-meta'), chips=qa('.report-checked span:not(.rc-label)'),
      checkedBox=q('.report-checked'), statusBox=q('.report-status'), statusCells=qa('.report-status>div');

  // All visible strings come from the active-language dictionary (i18n[currentLang]),
  // so the whole Mission Control window localizes and updates live on language change.
  function L(){ return i18n[currentLang]||i18n.en; }
  function fmt(s,map){ return String(s).replace(/\{(\w+)\}/g,function(_,k){return map[k]!=null?map[k]:'';}); }
  var SCOUNT=3;   // scenario 0 = the static report.* keys; scenarios 1..2 = report.scenB/scenC
  function scen(i){
    var r=L().report;
    if(i!==0){ return (i===1?r.scenB:r.scenC)||{}; }
    return {title:r.title,sev:r.metaSevV,comp:r.metaCompV,env:r.metaEnvV,dup:r.metaDupV,dupRes:r.metaDupRes,
            summary:r.summary,analysis:r.analysis,pre:r.pre};
  }
  function resultFor(k,m,s,glossN){
    if(k===0) return fmt(m.resGloss,{n:glossN});
    if(k===1) return m.resWorkflow;
    if(k===2) return m.resSeverity;
    if(k===3) return fmt(m.resClass,{comp:s.comp,env:s.env});
    if(k===4) return s.dupRes;
    if(k===5) return m.resPrivacy;
    return m.resFormat;
  }
  function applyReport(i){
    var s=scen(i);
    setText(h2,s.title);
    setText(metaB[0],s.sev); setText(metaB[1],s.comp); setText(metaB[2],s.env); setText(metaB[3],s.dup);
    setText(ps[0],s.summary); setText(ps[1],s.analysis); setText(pre,s.pre);
  }

  var GLOSS=[128,143,156,171];   // slight per-cycle variation in the glossary count

  // base per-stage active durations + result-display gaps + progress targets
  var BA=[0.60,0.58,0.62,0.64,0.72,0.64,0.66], BG=[0.20,0.20,0.22,0.22,0.26,0.22,0.24],
      PT=[16,29,43,57,72,86,96], T0=0.40, TRANS=0.8;
  function ease(x){ x=x<0?0:x>1?1:x; return x*x*(3-2*x); }
  function rnd(a,b){ return a+Math.random()*(b-a); }

  var sci=-1, cy=null;
  function setText(el,t){ if(el && t!=null && el.textContent!==t) el.textContent=t; }
  function newCycle(){
    // fade the previous result out and clear state before rebuilding (window stays put)
    steps.forEach(function(li){ li.classList.remove('active','done'); });
    if(awaitLi) awaitLi.classList.remove('active');
    metaC.forEach(function(c){ c.classList.remove('on','pulse'); });
    metaB.forEach(function(b){ if(b) b.classList.remove('on'); });
    [h2,metaBox,h3s[0],ps[0],h3s[1],ps[1],pre,checkedBox,statusBox].forEach(function(el){ if(el) el.classList.remove('on'); });
    chips.forEach(function(el){ el.classList.remove('on'); });
    statusCells.forEach(function(el){ el.classList.remove('on'); });

    // pick the next scenario (first cycle keeps the default; then avoid immediate repeat)
    if(sci<0) sci=0; else { var n; do{ n=Math.floor(Math.random()*SCOUNT); }while(n===sci); sci=n; }
    applyReport(sci);
    /* The report on screen is about to be a different bug. */
    if(sci>=0 && window.__reportRestart) window.__reportRestart();
    mission.classList.remove('mc-resetting');

    // build a slightly-varied schedule: a small global speed change, plus real
    // "thinking" pauses during duplicate search and (sometimes) the privacy scan.
    var speed=rnd(0.96,1.08), dupExtra=rnd(0.15,0.6), privExtra=Math.random()<0.5?rnd(0.2,0.9):0;
    var act=BA.slice(); act[4]+=dupExtra; act[5]+=privExtra;
    var ST=[], cur=T0, i;
    for(i=0;i<7;i++){ ST.push({s:cur,d:cur+act[i],p:PT[i]}); cur=ST[i].d+BG[i]; }
    var AW=cur+0.06, COMP=AW+0.22;
    for(i=0;i<7;i++){ ST[i].s*=speed; ST[i].d*=speed; } AW*=speed; COMP*=speed;
    var glossN=GLOSS[Math.floor(Math.random()*GLOSS.length)];
    // report assembly + metadata-value reveal times, derived from the (jittered) stages
    var rev=[], val=[];
    function R(el,t){ if(el) rev.push({el:el,t:t}); }
    R(h2,ST[0].s+0.3);
    metaC.forEach(function(c){ R(c,ST[1].d); });          // metadata skeleton (labels) appears
    R(metaBox,ST[1].d);
    val.push({b:metaB[0],c:metaC[0],t:ST[2].d}); val.push({b:metaB[1],c:metaC[1],t:ST[3].d});
    val.push({b:metaB[2],c:metaC[2],t:ST[3].d+0.08}); val.push({b:metaB[3],c:metaC[3],t:ST[4].d});
    R(h3s[0],ST[1].d+0.05); R(ps[0],ST[1].d+0.2);
    R(h3s[1],ST[4].s+0.05); R(ps[1],ST[4].s+0.2);
    R(pre,ST[5].s+0.1);
    R(checkedBox,ST[5].d); chips.forEach(function(el,k){ R(el,ST[5].d+k*0.07); });
    R(statusBox,ST[6].s+0.15); statusCells.forEach(function(el,k){ R(el,ST[6].s+0.15+k*0.09); });
    var holdEnd=COMP+rnd(20.5,27.5);
    cy={sci:sci,ST:ST,AW:AW,COMP:COMP,HOLD_END:holdEnd,CYCLE:holdEnd+TRANS,rev:rev,val:val,glossN:glossN};
    lastPct=lastStream=''; lastThinking=null; lastBar=-1;
    if(bar) bar.style.transform='scaleX(0)';
  }

  function setStep(li,state){ if(li.classList.contains(state)) return; li.classList.remove('active','done'); if(state) li.classList.add(state); }

  // Re-localize the live (JS-driven) text when the site language changes. applyLang() calls
  // this after swapping every data-t label, so scenario values follow suit with no refresh.
  window.__mcRelocalize=function(){
    if(reduced || !mission.classList.contains('mc-armed')){ setText(streamLine,L().mission.readyStream); return; }
    if(cy){ applyReport(cy.sci); lastPct=lastStream=''; lastThinking=null; frame(tc); }
  };

  // Static finished state for reduced-motion / no-JS (mission is not armed).
  if(reduced || !mission.classList.contains('mc-armed')){
    if(bar) bar.style.transform='scaleX(1)';
    setText(streamLine,L().mission.readyStream);
    return;
  }

  var lastPct='', lastStream='', lastThinking=null, lastBar=-1;
  function frame(tc){
    var ST=cy.ST, COMP=cy.COMP;
    // reset window: gently dim the content and rewind the bar; content swap happens at wrap
    if(tc>=cy.HOLD_END){ mission.classList.add('mc-resetting');
      if(lastBar!==0){ if(bar) bar.style.transform='scaleX(0)'; lastBar=0; } return; }
    mission.classList.remove('mc-resetting');

    var p;
    if(tc<ST[0].s) p=0; else if(tc>=COMP) p=100;
    else{ p=null; for(var i=0;i<7;i++){ var st=ST[i];
        if(tc<st.s){ p=ST[i-1].p; break; }
        if(tc<st.d){ var prev=i===0?0:ST[i-1].p; p=prev+(st.p-prev)*ease((tc-st.s)/(st.d-st.s)); break; } }
      if(p===null) p=96+4*ease((tc-ST[6].d)/(COMP-ST[6].d)); }
    var pr=Math.round(p);
    if(pr!==lastBar){ if(bar) bar.style.transform='scaleX('+(p/100).toFixed(4)+')'; lastBar=pr; }

    for(var j=0;j<7;j++){ setStep(steps[j], tc>=ST[j].d?'done':(tc>=ST[j].s?'active':'')); }
    if(awaitLi){ if(tc>=cy.AW) awaitLi.classList.add('active'); else awaitLi.classList.remove('active'); }

    var m=L().mission, s=scen(cy.sci);
    var curShort=m.initializing, curStream=m.initializing, thinking=true;
    for(var k=0;k<7;k++){ if(tc>=ST[k].s){ curShort=m.phases[k];
        if(tc<ST[k].d){ curStream='› '+m.acts[k]; thinking=true; }
        else { curStream='✓ '+resultFor(k,m,s,cy.glossN); thinking=false; } } }
    if(tc>=COMP){ curShort=m.complete; curStream='✓ '+m.readyStream; thinking=false;
      if(window.__reportReady)window.__reportReady(); }
    var pctText=(tc>=COMP)?(m.complete+' · 100%'):(curShort+' · '+pr+'%');
    if(pctText!==lastPct){ setText(pct,pctText); lastPct=pctText; }
    if(curStream!==lastStream){ setText(streamLine,curStream); lastStream=curStream; }
    if(thinking!==lastThinking){ if(stream) stream.classList.toggle('thinking',thinking); lastThinking=thinking; }

    for(var r=0;r<cy.rev.length;r++){ if(tc>=cy.rev[r].t) cy.rev[r].el.classList.add('on'); }
    for(var mm=0;mm<cy.val.length;mm++){ var v=cy.val[mm];
      if(tc>=v.t){ if(v.b) v.b.classList.add('on'); if(v.c){ v.c.classList.add('on'); if(tc<v.t+0.6) v.c.classList.add('pulse'); else v.c.classList.remove('pulse'); } } }
  }

  var raf=0, running=false, tc=0, lastNow=0;
  function loop(now){
    if(!running) return;
    var dt=lastNow?(now-lastNow)/1000:0; lastNow=now; if(dt>0.1) dt=0.1;
    tc+=dt;
    if(tc>=cy.CYCLE){ tc-=cy.CYCLE; newCycle(); }
    frame(tc);
    raf=requestAnimationFrame(loop);
  }
  function startLoop(){ if(running) return; running=true; lastNow=0; raf=requestAnimationFrame(loop); }
  function stopLoop(){ running=false; if(raf) cancelAnimationFrame(raf); raf=0; }

  // active only while on-screen AND not being inspected by the user
  var visible=false, userPaused=false, resumeT=0, guardT=0;
  function sync(){ var a=visible&&!userPaused; if(a) startLoop(); else stopLoop(); }

  // A pause must have an exit. Both pause sources are EDGE-triggered pairs — hover
  // pauses on mouseenter and resumes on mouseleave, focus pauses on focusin and
  // resumes on focusout — so a lost second event strands the simulation with no way back.
  // While paused, re-read the real state instead of trusting the pair to complete.
  function checkPause(){
    if(!userPaused){ clearInterval(guardT); guardT=0; return; }
    var hovering=false; try{ hovering=mission.matches(':hover'); }catch(_){}
    if(!hovering && !mission.contains(document.activeElement)){
      userPaused=false; clearInterval(guardT); guardT=0; sync();
    }
  }
  function pauseNow(){ clearTimeout(resumeT); userPaused=true; sync(); if(!guardT) guardT=setInterval(checkPause,1500); }
  function resumeSoon(){ clearTimeout(resumeT); resumeT=setTimeout(function(){ userPaused=false; if(guardT){clearInterval(guardT);guardT=0;} sync(); },900); }

  // THE PAUSE IS DRIVEN BY INPUT MODALITY, not by the event alone.
  //
  // A finger produces the FIRST half of each pair and never the second. The tap
  // synthesizes a mouseenter that has no mouseleave until you tap something else, and
  // it leaves focus sitting on whatever was tapped, so focusout cannot fire either.
  // Every tap inside Mission Control therefore froze it at whatever half-built state
  // it was in, permanently. Reproduced 2026-08-12 at 390x844: tapping "Show full
  // report" mid-generation left the bar at scaleX(0.4153) and "Loading severity · 42%"
  // for as long as the page stayed open, and tapping the report TITLE — which changes
  // no focus at all — froze it identically, so this was never specific to the toggle.
  //
  // Touch does not pause: there is no hover on a phone, and a visitor who taps the
  // report open is asking to SEE it finish. Mouse hover and KEYBOARD focus still pause,
  // because those are inspection states that genuinely end. The watchdog above covers
  // the remaining case of a mouseleave the browser never delivers.
  var touching=false, touchClear=0;
  function markTouch(){
    touching=true; clearTimeout(touchClear);
    // Outlast the synthesized mouse/focus events the tap emits just after it.
    touchClear=setTimeout(function(){ touching=false; },700);
    resumeSoon();
  }
  mission.addEventListener('touchstart',markTouch,{passive:true});
  mission.addEventListener('pointerdown',function(e){ if(e.pointerType!=='mouse') markTouch(); },{passive:true});
  mission.addEventListener('mouseenter',function(){ if(!touching) pauseNow(); });
  mission.addEventListener('mouseleave',resumeSoon);
  mission.addEventListener('focusin',function(e){
    // Keyboard focus only. A pointer that focused a control is not someone reading.
    var kb=!touching;
    try{ kb=kb&&e.target.matches(':focus-visible'); }catch(_){}
    // A mouse click on a control is left alone: hover already owns the pause and
    // mouseleave will release it. Only a touch needs the explicit release.
    if(kb) pauseNow(); else if(touching) resumeSoon();
  });
  mission.addEventListener('focusout',resumeSoon);

  newCycle();
  if('IntersectionObserver'in window){
    new IntersectionObserver(function(es){ es.forEach(function(e){ visible=e.isIntersecting; sync(); }); },{threshold:.2}).observe(mission);
  } else { visible=true; sync(); }
}
/* Consent banner localization. Merged into each EXISTING per-locale dictionary
   rather than via add()/makeLang — those set i18n[code]=merge(en,obj), which would
   clobber the whole locale. English is the base; each locale overlays its strings,
   and any locale without an override inherits English. */
const consentI18n = {
  ar: {
  title: "ملفات تعريف الارتباط والقياس",
  body: "نستخدم ملفات تعريف ارتباط أساسية لتشغيل هذا الموقع. بإذنك، نستخدم أيضًا ملفات تعريف ارتباط من Google لقياس إعلاناتنا وفهم استخدام الموقع. يمكنك تغيير اختيارك في أي وقت.",
  privacyLink: "اقرأ سياسة الخصوصية",
  manage: "إدارة التفضيلات",
  save: "حفظ التفضيلات",
  reject: "رفض غير الأساسية",
  accept: "قبول الكل",
  essential: "أساسية",
  essentialDesc: "مطلوبة لعمل الموقع.",
  always: "مفعّلة دائمًا",
  analytics: "التحليلات",
  analyticsDesc: "تساعدنا على فهم أداء الموقع واستخدامه بشكل عام.",
  advertising: "الإعلانات",
  advertisingDesc: "تساعدنا على معرفة ما إذا كانت إعلاناتنا تؤدي إلى عمليات شراء.",
  advMeasureTitle: "قياس الإعلانات",
  advProviderLabel: "المزوّد",
  advProvider: "Google",
  advPurposeLabel: "الغرض",
  advPurpose: "أداء الإعلانات وإسناد المشتريات",
  advInfoLabel: "المعلومات التي قد تُعالَج",
  advInfo: "معلومات التفاعل الإعلاني وقيمة الشراء والعملة ومرجع طلب غير شخصي",
  prefsLink: "تفضيلات ملفات تعريف الارتباط"
},
  en:{title:'Cookies and measurement',body:'We use essential cookies to run this site. With your permission we also use Google cookies to measure our advertising and understand site usage. You can change your choice at any time.',privacyLink:'Read our Privacy Policy',manage:'Manage preferences',save:'Save preferences',reject:'Reject non-essential',accept:'Accept all',essential:'Essential',essentialDesc:'Required for the site to function.',always:'Always on',analytics:'Analytics',analyticsDesc:'Helps us understand general site performance and usage.',advertising:'Advertising',advertisingDesc:'Helps us understand whether our advertising leads to purchases.',advMeasureTitle:'Advertising measurement',advProviderLabel:'Provider',advProvider:'Google',advPurposeLabel:'Purpose',advPurpose:'Advertising performance and purchase attribution',advInfoLabel:'Information that may be processed',advInfo:'Advertising interaction information, purchase value, currency, and a non personal order reference',prefsLink:'Cookie preferences'},
  de:{title:'Cookies und Messung',body:'Wir verwenden notwendige Cookies für den Betrieb der Website. Mit Ihrer Einwilligung nutzen wir außerdem Google-Cookies, um unsere Werbung zu messen und die Nutzung der Website zu verstehen. Sie können Ihre Auswahl jederzeit ändern.',privacyLink:'Datenschutzerklärung lesen',manage:'Einstellungen verwalten',save:'Einstellungen speichern',reject:'Nicht notwendige ablehnen',accept:'Alle akzeptieren',essential:'Notwendig',essentialDesc:'Für den Betrieb der Website erforderlich.',always:'Immer aktiv',analytics:'Analyse',analyticsDesc:'Hilft uns, die allgemeine Leistung und Nutzung der Website zu verstehen.',advertising:'Werbung',advertisingDesc:'Hilft uns zu verstehen, ob unsere Werbung zu Käufen führt.',advMeasureTitle:'Werbemessung',advProviderLabel:'Anbieter',advProvider:'Google',advPurposeLabel:'Zweck',advPurpose:'Werbeleistung und Kaufzuordnung',advInfoLabel:'Möglicherweise verarbeitete Informationen',advInfo:'Informationen zu Werbeinteraktionen, Kaufwert, Währung und eine nicht personenbezogene Bestellreferenz',prefsLink:'Cookie-Einstellungen'},
  es:{title:'Cookies y medición',body:'Usamos cookies esenciales para el funcionamiento del sitio. Con su permiso, también usamos cookies de Google para medir nuestra publicidad y entender el uso del sitio. Puede cambiar su elección en cualquier momento.',privacyLink:'Leer nuestra Política de Privacidad',manage:'Gestionar preferencias',save:'Guardar preferencias',reject:'Rechazar no esenciales',accept:'Aceptar todo',essential:'Esenciales',essentialDesc:'Necesarias para el funcionamiento del sitio.',always:'Siempre activas',analytics:'Analítica',analyticsDesc:'Nos ayuda a entender el rendimiento y el uso general del sitio.',advertising:'Publicidad',advertisingDesc:'Nos ayuda a saber si nuestra publicidad genera compras.',advMeasureTitle:'Medición de publicidad',advProviderLabel:'Proveedor',advProvider:'Google',advPurposeLabel:'Finalidad',advPurpose:'Rendimiento publicitario y atribución de compras',advInfoLabel:'Información que puede procesarse',advInfo:'Información sobre la interacción con anuncios, el valor de la compra, la moneda y una referencia de pedido no personal',prefsLink:'Preferencias de cookies'},
  fr:{title:'Cookies et mesure',body:'Nous utilisons des cookies essentiels pour faire fonctionner le site. Avec votre accord, nous utilisons aussi des cookies Google pour mesurer notre publicité et comprendre l’utilisation du site. Vous pouvez modifier votre choix à tout moment.',privacyLink:'Lire notre politique de confidentialité',manage:'Gérer les préférences',save:'Enregistrer les préférences',reject:'Refuser les non essentiels',accept:'Tout accepter',essential:'Essentiels',essentialDesc:'Nécessaires au fonctionnement du site.',always:'Toujours actifs',analytics:'Analyse',analyticsDesc:'Nous aide à comprendre les performances et l’utilisation générales du site.',advertising:'Publicité',advertisingDesc:'Nous aide à comprendre si notre publicité génère des achats.',advMeasureTitle:'Mesure publicitaire',advProviderLabel:'Fournisseur',advProvider:'Google',advPurposeLabel:'Finalité',advPurpose:'Performance publicitaire et attribution des achats',advInfoLabel:'Informations susceptibles d’être traitées',advInfo:'Informations sur l’interaction publicitaire, montant de l’achat, devise et une référence de commande non personnelle',prefsLink:'Préférences des cookies'},
  it:{title:'Cookie e misurazione',body:'Usiamo cookie essenziali per far funzionare il sito. Con il suo consenso usiamo anche cookie di Google per misurare la nostra pubblicità e capire l’uso del sito. Può cambiare la sua scelta in qualsiasi momento.',privacyLink:'Leggi la nostra Informativa sulla privacy',manage:'Gestisci preferenze',save:'Salva preferenze',reject:'Rifiuta non essenziali',accept:'Accetta tutto',essential:'Essenziali',essentialDesc:'Necessari al funzionamento del sito.',always:'Sempre attivi',analytics:'Analisi',analyticsDesc:'Ci aiuta a comprendere le prestazioni e l’utilizzo generali del sito.',advertising:'Pubblicità',advertisingDesc:'Ci aiuta a capire se la nostra pubblicità genera acquisti.',advMeasureTitle:'Misurazione pubblicitaria',advProviderLabel:'Fornitore',advProvider:'Google',advPurposeLabel:'Finalità',advPurpose:'Prestazioni pubblicitarie e attribuzione degli acquisti',advInfoLabel:'Informazioni che possono essere trattate',advInfo:'Informazioni sull’interazione con gli annunci, valore dell’acquisto, valuta e un riferimento d’ordine non personale',prefsLink:'Preferenze cookie'},
  'pt-br':{title:'Cookies e medição',body:'Usamos cookies essenciais para o funcionamento do site. Com sua permissão, também usamos cookies do Google para medir nossa publicidade e entender o uso do site. Você pode mudar sua escolha a qualquer momento.',privacyLink:'Ler nossa Política de Privacidade',manage:'Gerenciar preferências',save:'Salvar preferências',reject:'Recusar não essenciais',accept:'Aceitar tudo',essential:'Essenciais',essentialDesc:'Necessários para o funcionamento do site.',always:'Sempre ativos',analytics:'Análise',analyticsDesc:'Ajuda-nos a entender o desempenho e o uso geral do site.',advertising:'Publicidade',advertisingDesc:'Ajuda-nos a entender se a nossa publicidade gera compras.',advMeasureTitle:'Medição de publicidade',advProviderLabel:'Provedor',advProvider:'Google',advPurposeLabel:'Finalidade',advPurpose:'Desempenho da publicidade e atribuição de compras',advInfoLabel:'Informações que podem ser processadas',advInfo:'Informações sobre a interação com anúncios, valor da compra, moeda e uma referência de pedido não pessoal',prefsLink:'Preferências de cookies'},
  ja:{title:'Cookieと計測',body:'当サイトの動作に必要なCookieを使用します。ご同意いただいた場合は、広告の効果測定とサイト利用状況の把握のためにGoogleのCookieも使用します。設定はいつでも変更できます。',privacyLink:'プライバシーポリシーを読む',manage:'設定を管理',save:'設定を保存',reject:'必須以外を拒否',accept:'すべて許可',essential:'必須',essentialDesc:'サイトの動作に必要です。',always:'常に有効',analytics:'分析',analyticsDesc:'サイトの全般的なパフォーマンスと利用状況の把握に役立ちます。',advertising:'広告',advertisingDesc:'広告が購入につながっているかどうかの把握に役立ちます。',advMeasureTitle:'広告計測',advProviderLabel:'提供者',advProvider:'Google',advPurposeLabel:'目的',advPurpose:'広告のパフォーマンスと購入のアトリビューション',advInfoLabel:'処理される可能性のある情報',advInfo:'広告操作に関する情報、購入金額、通貨、および個人を特定しない注文参照',prefsLink:'Cookie設定'},
  ko:{title:'쿠키 및 측정',body:'사이트 운영에 필요한 필수 쿠키를 사용합니다. 동의하시면 광고 성과 측정과 사이트 이용 현황 파악을 위해 Google 쿠키도 사용합니다. 선택은 언제든지 변경할 수 있습니다.',privacyLink:'개인정보처리방침 보기',manage:'기본 설정 관리',save:'기본 설정 저장',reject:'필수 외 거부',accept:'모두 허용',essential:'필수',essentialDesc:'사이트 작동에 필요합니다.',always:'항상 켜짐',analytics:'분석',analyticsDesc:'사이트의 전반적인 성능과 사용 현황을 파악하는 데 도움이 됩니다.',advertising:'광고',advertisingDesc:'광고가 구매로 이어지는지 파악하는 데 도움이 됩니다.',advMeasureTitle:'광고 측정',advProviderLabel:'제공자',advProvider:'Google',advPurposeLabel:'목적',advPurpose:'광고 성과 및 구매 기여도 분석',advInfoLabel:'처리될 수 있는 정보',advInfo:'광고 상호작용 정보, 구매 금액, 통화, 개인정보가 아닌 주문 참조',prefsLink:'쿠키 기본 설정'},
  zh:{title:'Cookie 与衡量',body:'我们使用必要的 Cookie 来运行本网站。在您同意后，我们还会使用 Google 的 Cookie 来衡量广告效果并了解网站使用情况。您可以随时更改您的选择。',privacyLink:'阅读我们的隐私政策',manage:'管理偏好设置',save:'保存偏好设置',reject:'拒绝非必要',accept:'全部接受',essential:'必要',essentialDesc:'网站运行所必需。',always:'始终开启',analytics:'分析',analyticsDesc:'帮助我们了解网站的总体性能和使用情况。',advertising:'广告',advertisingDesc:'帮助我们了解广告是否带来购买。',advMeasureTitle:'广告衡量',advProviderLabel:'提供方',advProvider:'Google',advPurposeLabel:'用途',advPurpose:'广告效果与购买归因',advInfoLabel:'可能处理的信息',advInfo:'广告互动信息、购买金额、币种以及不含个人信息的订单编号',prefsLink:'Cookie 偏好设置'},
  ru:{title:'Файлы cookie и измерение',body:'Мы используем необходимые файлы cookie для работы сайта. С вашего согласия мы также используем файлы cookie Google для оценки нашей рекламы и анализа использования сайта. Вы можете изменить свой выбор в любое время.',privacyLink:'Читать нашу Политику конфиденциальности',manage:'Управление настройками',save:'Сохранить настройки',reject:'Отклонить необязательные',accept:'Принять все',essential:'Необходимые',essentialDesc:'Необходимы для работы сайта.',always:'Всегда включены',analytics:'Аналитика',analyticsDesc:'Помогает нам понимать общую производительность и использование сайта.',advertising:'Реклама',advertisingDesc:'Помогает нам понять, приводит ли наша реклама к покупкам.',advMeasureTitle:'Измерение рекламы',advProviderLabel:'Поставщик',advProvider:'Google',advPurposeLabel:'Цель',advPurpose:'Эффективность рекламы и атрибуция покупок',advInfoLabel:'Информация, которая может обрабатываться',advInfo:'Информация о взаимодействии с рекламой, сумма покупки, валюта и обезличенный номер заказа',prefsLink:'Настройки cookie'}
};
/* consentI18n is applied to i18n at the very end of this file, AFTER the generated
   per-locale overrides (add(...)) run — otherwise those overrides, which merge from
   the English base, would replace each locale's consent block with the English one. */

/* Consent banner controller. The banner (index.html) is denied-by-default and only
   auto-shows when no decision cookie exists; a footer "Cookie preferences" link
   reopens it. Choices are persisted + mapped to Consent Mode v2 by window.BugitConsent
   (consent.js). Advertising drives ad_storage/ad_user_data/ad_personalization together;
   Analytics drives analytics_storage. Essential-only never grants advertising. */
function initConsent(){
  const C=window.BugitConsent; if(!C) return;
  const banner=document.getElementById('consentBanner'); if(!banner) return;
  const prefs=document.getElementById('consentPrefs');
  const adv=document.getElementById('consentAdvertising');
  const ana=document.getElementById('consentAnalytics');
  const bManage=document.getElementById('consentManage');
  const bSave=document.getElementById('consentSave');
  const bReject=document.getElementById('consentReject');
  const bAccept=document.getElementById('consentAccept');
  const link=document.getElementById('cookiePrefsLink');

  /* THE BANNER RESERVES ITS OWN HEIGHT. It is fixed to the bottom of the viewport and nothing
     used to account for that, so the last screenful of the document sat underneath it. Measured
     at maximum scroll, at 320, 375, 430 and 1280 alike, eight things could not be reached at any
     scroll position while it was up: Documentation, License Agreement, Privacy Policy, Refund
     Policy, Commercial Transactions, Support, Cookie preferences, and the copyright line. The
     whole footer legal row, blocked by a banner whose own text says to read the privacy policy.

     The height cannot be a constant. It is 322px at 320x568 and 211px at 1280x800, and it grows
     by about 200px the moment Manage preferences is opened. So it is measured, and re-measured
     whenever it changes. styles.css section 110 turns it into padding at the END of the document
     rather than scroll-padding, which would have re-inset the scrollport that every view()
     timeline on the page is measured against.

     THE REFERENCE IS LOAD-BEARING, for the same reason it is on the report panel's observer
     further up this file: a ResizeObserver with nothing holding it is collectable, and the
     symptom is not an error, it is a callback that silently stops arriving. */
  let lastReserve=-1;
  function reserve(){
    const on=!banner.hidden;
    const h=on?Math.ceil(banner.getBoundingClientRect().height):0;
    document.documentElement.classList.toggle('consent-open',on);
    if(h===lastReserve) return;   /* writing it back unchanged can re-trigger the observer */
    lastReserve=h;
    document.documentElement.style.setProperty('--consent-h',h+'px');
  }
  if(window.ResizeObserver){ banner.__consentRO=new ResizeObserver(function(){reserve();}); banner.__consentRO.observe(banner); }
  window.addEventListener('resize',reserve);
  function open(managing){
    const cur=C.read();
    if(adv) adv.checked=!!(cur&&cur.ad_storage);
    if(ana) ana.checked=!!(cur&&cur.analytics_storage);
    if(prefs) prefs.hidden=!managing;
    if(bSave) bSave.hidden=!managing;
    if(bManage) bManage.hidden=!!managing;
    banner.hidden=false;
    reserve();
    try{banner.focus();}catch(e){}
  }
  function close(){ banner.hidden=true; reserve(); }
  function collapsePrefs(){ if(prefs)prefs.hidden=true; if(bSave)bSave.hidden=true; if(bManage)bManage.hidden=false; reserve(); }
  function decide(advertising,analytics){
    C.write({ad_storage:advertising,ad_user_data:advertising,ad_personalization:advertising,analytics_storage:analytics});
    close();
  }
  if(bAccept) bAccept.onclick=()=>decide(true,true);
  if(bReject) bReject.onclick=()=>decide(false,false);
  if(bManage) bManage.onclick=()=>open(true);
  if(bSave) bSave.onclick=()=>decide(!!(adv&&adv.checked),!!(ana&&ana.checked));
  /* Manage preferences makes the banner about 200px taller; the reserve follows it. */
  if(link) link.onclick=(e)=>{e.preventDefault();open(true);};
  banner.addEventListener('keydown',(e)=>{ if(e.key==='Escape'&&prefs&&!prefs.hidden) collapsePrefs(); });
  if(!C.hasDecision()) open(false);
}

/* See the note above initInitialScroll: a bare #anchor is resolved by the browser before
   this fires, against a homepage that is still hidden. Re-run it once the view is back. */
var _hashBefore=location.hash;
window.addEventListener('hashchange',function(){
  var from=_hashBefore,to=location.hash;_hashBefore=to;
  renderDocRoute();
  var isSpa=function(h){return /^#\/.+/.test(h)};
  if(isSpa(from)&&to&&!isSpa(to)){
    var el=document.getElementById(to.slice(1));
    if(el)landOn(el,false);
  }
});document.addEventListener('DOMContentLoaded',()=>{renderParticles();renderTools();initLang();initDemo();initDocNav();initMobileNav();applyLang(currentLang);renderDocRoute();initAuth();initMission();initReportDisclosure();initConsent();requestAnimationFrame(initInitialScroll)});

/* v16 docs sync: official BugIt QA Agent documentation updates */
const bugitV16Faq = {
  en: [
    ['Does BugIt file automatically?', 'No. Every ticket, comment, attachment or notification is previewed first. Before an irreversible filing, you approve it by typing FILE IT; chat text alone never files. A plain "yes" is not enough. Use dry run for zero-write practice.'],
    ['Which trackers have built-in tested mapping?', 'All eleven include built-in, tested field mapping and create tickets directly through the tracker’s REST API, using a credential you create in your own account: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana and Trello. Filing does not use MCP. Crash tools, test management and other services still connect through your own MCP server.'],
    ['Do I need GitHub Copilot?', 'GitHub Copilot is the easiest setup and is recommended. BugIt also works with the Claude extension in VS Code, another assistant, or a plain terminal. Filing is a command, so it works the same in all of them.'],
    ['Can I use Claude, Gemini or GPT?', 'Yes, inside GitHub Copilot where those models are available to your plan. Standalone mode supports your own OpenAI or Anthropic key.'],
    ['Does Taskivator see my work?', 'No. Bug reports, specs, glossary, screenshots, code, settings and tickets are not sent to Taskivator. Only license/update data is used.'],
    ['What license/update data is sent?', 'BugIt sends Taskivator only licensing and update data: your Portal sign-in; an anonymous, one-way hashed device identifier; a random installation identifier; your device label and operating system; the BugIt version and selected plan; short-lived cryptographic challenge data; and the entitlement approved for this device.'],
    ['What is included in Team?','BugIt Team is available now. A one-time payment covers a 1-year license for up to 5 members, and each member gets their own BugIt account, their own sign-in, and their own device activation, instead of a shared license. Team configuration is shared and managed centrally in the Portal, and it does not auto-renew. Solo is unaffected and available too.'],
    ['Can I practice without filing?', 'Yes. Use dry run to generate the full report without creating tickets, comments, attachments or notifications. Dry run stops BugIt’s bundled helpers from writing and tells the agent to refuse tracker writes; that refusal follows BugIt’s instructions rather than a platform lock, so use read-only credentials when evaluating.'],
    ['What files can I safely edit?', 'Safe buyer-owned files include config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md, and .github/instructions/house-style.instructions.md if you create it.'],
    ['What should I not hand-edit?', 'Do not hand-edit .github/agents/bugit-qa-agent.agent.md, other shipped files under .github/instructions/, or anything in tools/. Updates overwrite those product files and they are not backed up.'],
    ['How do updates work?', 'BugIt backs up your buyer-owned settings, verifies signed updates, installs in place, and preserves your config, glossary, house style, license and connections.'],
    ['What happens when my license expires?', 'BugIt is a one-time purchase and does not auto-renew. Your one-year license covers updates and license/activation services; when it ends, a 3-day grace period follows, after which filing and activation features need a current license, while your local files and settings stay yours. You can buy a new license to continue. There is no automatic charge. Licensing-server outages are separate: cached verification lets you keep working for up to 72 hours offline.'],
    ['If I buy BugIt again, does the time add on?', 'No. Buying again replaces your current activation and starts a fresh one-year license from that date, so buy again near the end of your current license. Purchases never renew automatically.'],
    ['How do I get support?', 'First ask the AI assistant to diagnose the issue, then run Check status or Check readiness. If you are still stuck, open a support ticket from your BugIt dashboard. There is no need to include confidential project details.']
  ],
  ja: [
    ['BugItは自動で登録しますか？','いいえ。すべてのチケット、コメント、添付、通知はまずプレビューされます。取り消せない起票の前には、FILE IT と入力して承認します。チャットの文章だけでは登録されません。単なる「はい」では実行されません。ゼロ書き込みで練習するには dry run を使ってください。'],
    ['組み込みの検証済みマッピングがあるトラッカーは？','11 のトラッカーすべてが検証済みフィールドマッピングに対応し、お客様ご自身のアカウントで作成した資格情報を使って各トラッカーの REST API へ直接登録します（登録に MCP は使いません）: Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana、Trello。クラッシュ解析ツールやテスト管理などのサービスは、引き続きご自身の MCP サーバー経由で接続します。'],
    ['GitHub Copilotは必要ですか？','最も簡単なセットアップなので推奨です。VS Code の Claude 拡張機能、他のアシスタント、普通のターミナルでも動作します。登録はコマンドなので、どこでも同じように使えます。'],
    ['Claude、Gemini、GPTは使えますか？','はい。GitHub Copilot 内でプランに含まれるモデルを使えます。スタンドアロンでは OpenAI または Anthropic キーに対応します。'],
    ['Taskivatorは私の作業を見ますか？','いいえ。バグレポート、仕様、用語集、スクリーンショット、コード、設定、チケットは Taskivator に送信されません。使用されるのはライセンス/更新データのみです。'],
    ['送信されるライセンス/更新データは？','ブラウザーの Portal で行う BugIt アカウントへのサインイン、一方向にハッシュ化された匿名のデバイス ID、ランダムなインストール ID、デバイス名（ホスト名）と OS 名、BugIt のバージョン、選択した Solo または Team のプラン、短時間だけ有効な暗号学的チャレンジ情報、そしてこのデバイスに対して承認した Solo または Team のライセンス情報です。'],
    ['Teamには何が含まれますか？','BugIt Team は現在ご利用いただけます。買い切りで、最大5名向けの1年間ライセンスです。共有ライセンスではなく、各メンバーが自分専用の BugIt アカウント、自分専用のサインイン、自分専用のデバイスアクティベーションを持ちます。チーム設定は共有され、ポータルで一元管理され、自動更新はありません。Solo プランは影響を受けず、同様にご利用いただけます。'],
    ['登録せずに練習できますか？','はい。dry run を使うと、チケット、コメント、添付、通知を作成せずに完全なレポートを生成できます。 dry run はBugItに付属するヘルパーの書き込みを止め、エージェントにトラッカーへの書き込みを拒否するよう指示します。この拒否はプラットフォーム側のロックではなくBugItの指示に従うものなので、検証時は読み取り専用の認証情報を使ってください。'],
    ['安全に編集できるファイルは？','config.json、.vscode/mcp.json、.github/glossary/terms.template.md、.github/instructions/learned.instructions.md、作成した場合の .github/instructions/house-style.instructions.md です。'],
    ['手動編集してはいけないものは？','.github/agents/bugit-qa-agent.agent.md、出荷済みの .github/instructions/ 内の他ファイル、tools/ 内のファイルは編集しないでください。更新で上書きされ、バックアップされません。'],
    ['更新はどう動きますか？','BugItはユーザー所有の設定をバックアップし、署名済み更新を検証し、設定、用語集、ハウススタイル、ライセンス、接続を保持したまま更新します。'],
    ['ライセンスが切れるとどうなりますか？','ライセンス期間が終了すると3日間の猚予期間があり、その後は起票とアクティベーションに有効なライセンスが必要になります。ローカルのファイルと設定はそのまま残ります。ライセンスサーバー障害時は別で、キャッシュ確認により最大72時間オフラインで作業できます。'],
    ['更新ライセンスは積み上がりますか？','いいえ。更新すると現在の有効化を置き換え、その日から新しい期間が始まります。現在の期間の終わり近くで更新してください。'],
    ['サポートはどう受けますか？','まずAIアシスタントに診断を依頼し、Check status または Check readiness を実行してください。それでも解決しない場合は、BugItダッシュボードからサポートチケットを送信してください。機密情報を含める必要はありません。']
  ],
  es: [
    ['¿BugIt registra errores automáticamente?','No. Cada ticket, comentario, adjunto o notificación se muestra primero como vista previa. Antes de registrar un ticket irreversible, lo apruebas escribiendo FILE IT; el texto del chat por sí solo nunca registra nada. Un simple «sí» no basta. Use dry run para practicar sin ninguna escritura.'],
    ['¿Qué trackers tienen mapeo integrado y probado?','Los once tienen mapeo de campos integrado y probado y registran directamente a través de la API REST de cada tracker, con una credencial que creas en tu propia cuenta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana y Trello. Registrar no usa MCP. Las herramientas de fallos, la gestión de pruebas y otros servicios siguen conectándose mediante tu propio servidor MCP.'],
    ['¿Necesito GitHub Copilot?','GitHub Copilot es la configuración más sencilla y recomendada. BugIt también puede ejecutarse en modo standalone con tu propia clave de OpenAI o Anthropic.'],
    ['¿Puedo usar Claude, Gemini o GPT?','Sí, dentro de GitHub Copilot cuando esos modelos estén disponibles en tu plan. El modo standalone admite tu propia clave de OpenAI o Anthropic.'],
    ['¿Taskivator ve mi trabajo?','No. Los reportes de errores, especificaciones, glosario, capturas, código, configuración y tickets no se envían a Taskivator. Solo se usa información de licencia y actualización.'],
    ['¿Qué datos de licencia/actualización se envían?','El inicio de sesión en su cuenta de BugIt (en el navegador, en el Portal), un identificador de dispositivo con hash unidireccional, un identificador de instalación aleatorio, el nombre de su equipo (hostname) y el del sistema operativo, la versión de BugIt y el filtro de plan Solo o Team que elija, material criptográfico de desafío de corta duración y la titularidad Solo o Team que aprueba para este dispositivo.'],
    ['¿Qué incluye Team?','El plan Team ya está disponible. Un pago único cubre una licencia de 1 año para hasta 5 miembros: cada miembro tiene su propia cuenta de BugIt, su propio inicio de sesión y su propia activación de dispositivo, en lugar de una licencia compartida. La configuración del equipo se comparte y se gestiona de forma centralizada en el Portal, y no se renueva automáticamente. El plan Solo no se ve afectado y también está disponible.'],
    ['¿Puedo practicar sin registrar nada?','Sí. Usa dry run para generar el reporte completo sin crear tickets, comentarios, adjuntos ni notificaciones. Dry run impide que los helpers integrados de BugIt escriban y ordena al agente rechazar escrituras en el tracker; esa negativa sigue las instrucciones de BugIt en lugar de un bloqueo de plataforma, así que use credenciales de solo lectura al evaluar.'],
    ['¿Qué archivos puedo editar con seguridad?','Puedes editar config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md y .github/instructions/house-style.instructions.md si lo creas.'],
    ['¿Qué no debo editar manualmente?','No edites .github/agents/bugit-qa-agent.agent.md, otros archivos incluidos bajo .github/instructions/ ni nada dentro de tools/. Las actualizaciones sobrescriben esos archivos de producto y no se respaldan.'],
    ['¿Cómo funcionan las actualizaciones?','BugIt respalda tus archivos propios de configuración, verifica actualizaciones firmadas, instala en el mismo lugar y conserva config, glosario, estilo, licencia y conexiones.'],
    ['¿Qué pasa cuando expira mi licencia?','Hay un periodo de gracia de 3 días tras terminar la licencia anual. Si falla el servidor de licencias, una verificación en caché permite seguir trabajando hasta 72 horas sin conexión.'],
    ['¿Las renovaciones se acumulan?','No. Una renovación reemplaza tu activación actual y empieza un nuevo periodo desde esa fecha. Renueva cerca del final del periodo actual.'],
    ['¿Cómo recibo soporte?','Primero pide al asistente de IA que diagnostique el problema y ejecuta Check status o Check readiness. Si sigues atascado, abre un ticket de soporte desde tu panel de BugIt: no necesitas incluir detalles confidenciales del proyecto.']
  ],
  fr: [
    ['BugIt crée-t-il des tickets automatiquement ?','Non. Chaque ticket, commentaire, pièce jointe ou notification est d’abord prévisualisé. Avant de créer un ticket irréversible, vous l’approuvez en tapant FILE IT ; le texte du chat seul ne crée jamais rien. Un simple « oui » ne suffit pas. Utilisez dry run pour vous entraîner sans aucune écriture.'],
    ['Quels trackers ont un mapping intégré et testé ?','Les onze ont un mapping de champs intégré et testé et créent les tickets directement via l’API REST de chaque outil, avec un identifiant que vous créez dans votre propre compte : Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana et Trello. La création n’utilise pas MCP. Les outils de plantage, la gestion des tests et les autres services passent toujours par votre propre serveur MCP.'],
    ['Ai-je besoin de GitHub Copilot ?','GitHub Copilot est recommandé et offre l’installation la plus simple. BugIt fonctionne aussi avec l’extension Claude dans VS Code, un autre assistant ou un simple terminal : la création est une commande, elle fonctionne donc de la même façon partout.'],
    ['Puis-je utiliser Claude, Gemini ou GPT ?','Oui, dans GitHub Copilot lorsque ces modèles sont disponibles dans votre abonnement. Le mode autonome prend en charge votre propre clé OpenAI ou Anthropic.'],
    ['Taskivator voit-il mon travail ?','Non. Les rapports, specs, glossaire, captures, code, réglages et tickets ne sont pas envoyés à Taskivator. Seules les données de licence/mise à jour sont utilisées.'],
    ['Quelles données de licence/mise à jour sont envoyées ?','La connexion à votre compte BugIt (dans le navigateur, sur le Portal), un identifiant d’appareil haché à sens unique, un identifiant d’installation aléatoire, le nom de votre machine (hostname) et celui du système d’exploitation, la version de BugIt et le filtre d’offre Solo ou Team que vous choisissez, un matériel cryptographique de défi à durée de vie courte, et le droit Solo ou Team que vous approuvez pour cet appareil.'],
    ['Que comprend Team ?','L’offre Team est disponible dès maintenant. Un paiement unique couvre une licence de 1 an pour jusqu’à 5 membres, et chaque membre dispose de son propre compte BugIt, de sa propre connexion et de sa propre activation d’appareil, au lieu d’une licence partagée. La configuration de l’équipe est partagée et gérée de façon centralisée dans le Portail, sans reconduction automatique. L’offre Solo n’est pas affectée et reste disponible.'],
    ['Puis-je m’entraîner sans créer de ticket ?','Oui. Utilisez dry run pour générer le rapport complet sans créer de tickets, commentaires, pièces jointes ni notifications. Le dry run empêche les utilitaires intégrés de BugIt d’écrire et demande à l’agent de refuser les écritures dans le tracker ; ce refus suit les instructions de BugIt et non un verrou de la plateforme, utilisez donc des identifiants en lecture seule pour vos essais.'],
    ['Quels fichiers puis-je modifier sans risque ?','Vous pouvez modifier config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md et .github/instructions/house-style.instructions.md si vous le créez.'],
    ['Que ne dois-je pas modifier à la main ?','Ne modifiez pas .github/agents/bugit-qa-agent.agent.md, les autres fichiers livrés sous .github/instructions/ ni les fichiers dans tools/. Les mises à jour écrasent ces fichiers produit et ils ne sont pas sauvegardés.'],
    ['Comment fonctionnent les mises à jour ?','BugIt sauvegarde vos fichiers de configuration, vérifie les mises à jour signées, installe sur place et conserve config, glossaire, style, licence et connexions.'],
    ['Que se passe-t-il à l’expiration de ma licence ?','Une période de grâce de 3 jours suit la fin de la licence annuelle. En cas de panne du serveur de licence, une vérification en cache vous laisse travailler jusqu’à 72 heures hors ligne.'],
    ['Les renouvellements se cumulent-ils ?','Non. Un renouvellement remplace votre activation actuelle et démarre une nouvelle période à cette date. Renouvelez près de la fin de la période en cours.'],
    ['Comment obtenir de l’aide ?','Demandez d’abord à l’assistant IA de diagnostiquer le problème, puis lancez Check status ou Check readiness. Si vous êtes toujours bloqué, ouvrez un ticket de support depuis votre tableau de bord BugIt. Il est inutile d’inclure des détails confidentiels du projet.']
  ],
  de: [
    ['Legt BugIt automatisch Bugs an?','Nein. Jedes Ticket, jeder Kommentar, jeder Anhang und jede Benachrichtigung wird zuerst als Vorschau angezeigt. Vor einer irreversiblen Einreichung bestätigen Sie durch die Eingabe von FILE IT; Chat-Text allein reicht nie zum Einreichen. Ein einfaches „Ja“ reicht nicht aus. Nutzen Sie dry run, um ohne jeden Schreibvorgang zu üben.'],
    ['Welche Tracker haben integriertes, getestetes Mapping?','Alle elf haben integriertes, getestetes Feld-Mapping und reichen direkt über die eigene REST-API des Trackers ein, mit einer Zugangsberechtigung, die Sie in Ihrem eigenen Konto anlegen: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana und Trello. Das Einreichen nutzt kein MCP. Crash-Tools, Testmanagement und weitere Dienste verbinden Sie weiterhin über Ihren eigenen MCP-Server.'],
    ['Brauche ich GitHub Copilot?','GitHub Copilot ist empfohlen und am einfachsten einzurichten. BugIt kann auch eigenständig mit Ihrem OpenAI- oder Anthropic-Schlüssel laufen.'],
    ['Kann ich Claude, Gemini oder GPT nutzen?','Ja, in GitHub Copilot, sofern diese Modelle in Ihrem Plan verfügbar sind. Der Standalone-Modus unterstützt Ihren OpenAI- oder Anthropic-Schlüssel.'],
    ['Sieht Taskivator meine Arbeit?','Nein. Bugreports, Spezifikationen, Glossar, Screenshots, Code, Einstellungen und Tickets werden nicht an Taskivator gesendet. Es werden nur Lizenz-/Update-Daten verwendet.'],
    ['Welche Lizenz-/Update-Daten werden gesendet?','Die Anmeldung bei Ihrem BugIt-Konto (im Browser, im Portal), eine mit einem Einweg-Hash versehene Geräte-ID, eine zufällige Installationskennung, den Namen Ihres Geräts (Hostname) und des Betriebssystems, die BugIt-Version und den von Ihnen gewählten Solo- oder Team-Planfilter, kurzlebiges kryptografisches Challenge-Material und die Solo- oder Team-Berechtigung, die Sie für dieses Gerät bestätigen.'],
    ['Was enthält Team?','Der Team-Tarif ist jetzt verfügbar. Eine Einmalzahlung deckt eine 1-Jahres-Lizenz für bis zu 5 Mitglieder ab, und jedes Mitglied erhält ein eigenes BugIt-Konto, eine eigene Anmeldung und eine eigene Geräteaktivierung statt einer gemeinsamen Lizenz. Die Team-Konfiguration wird gemeinsam genutzt und zentral im Portal verwaltet, ohne automatische Verlängerung. Der Solo-Tarif ist nicht betroffen und ebenfalls verfügbar.'],
    ['Kann ich ohne Filing üben?','Ja. Mit dry run erzeugen Sie einen vollständigen Bericht, ohne Tickets, Kommentare, Anhänge oder Benachrichtigungen zu erstellen. Dry run hindert die mitgelieferten BugIt-Helfer am Schreiben und weist den Agenten an, Tracker-Schreibzugriffe zu verweigern; diese Verweigerung folgt den Anweisungen von BugIt, nicht einer plattformseitigen Sperre. Verwenden Sie zum Testen daher schreibgeschützte Zugangsdaten.'],
    ['Welche Dateien darf ich sicher bearbeiten?','Sicher bearbeitbar sind config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md und .github/instructions/house-style.instructions.md, falls Sie sie erstellen.'],
    ['Was sollte ich nicht manuell bearbeiten?','Bearbeiten Sie nicht .github/agents/bugit-qa-agent.agent.md, andere ausgelieferte Dateien unter .github/instructions/ oder Dateien in tools/. Updates überschreiben diese Produktdateien und sie werden nicht gesichert.'],
    ['Wie funktionieren Updates?','BugIt sichert Ihre eigenen Einstellungen, prüft signierte Updates, installiert direkt im bestehenden Ordner und behält Konfiguration, Glossar, Hausstil, Lizenz und Verbindungen.'],
    ['Was passiert, wenn meine Lizenz abläuft?','Nach Ablauf der Jahreslizenz gilt eine Schonfrist von 3 Tagen; danach endet der Anspruch auf Einreichung und Aktivierung; Ihre lokalen Dateien und Einstellungen bleiben Ihnen erhalten. Bei Ausfall des Lizenzservers erlaubt die zwischengespeicherte Prüfung bis zu 72 Stunden Offline-Arbeit.'],
    ['Stapeln sich Verlängerungen?','Nein. Eine Verlängerung ersetzt Ihre aktuelle Aktivierung und startet ab diesem Datum eine neue Laufzeit. Verlängern Sie daher nahe am Ende der aktuellen Laufzeit.'],
    ['Wie bekomme ich Support?','Bitten Sie zuerst den KI-Assistenten um Diagnose und führen Sie Check status oder Check readiness aus. Wenn Sie weiterhin nicht weiterkommen, öffnen Sie über Ihr BugIt-Dashboard ein Support-Ticket. Vertrauliche Projektdaten müssen Sie dabei nicht angeben.']
  ],
  'pt-br': [
    ['O BugIt registra bugs automaticamente?','Não. Cada ticket, comentário, anexo ou notificação é visualizado primeiro. Antes de registrar um ticket irreversível, você aprova digitando FILE IT; o texto do chat sozinho nunca registra nada. Um simples "sim" não basta.'],
    ['Quais trackers têm mapeamento integrado e testado?','Todos os onze têm mapeamento de campos integrado e testado e registram direto pela API REST de cada tracker, com uma credencial que você cria na sua própria conta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. Registrar não usa MCP. Ferramentas de travamento, gestão de testes e outros serviços continuam se conectando pelo seu próprio servidor MCP.'],
    ['Preciso do GitHub Copilot?','O GitHub Copilot é recomendado e é a configuração mais simples. O BugIt também funciona com a extensão do Claude no VS Code, com outro assistente ou em um terminal comum: registrar é um comando, então funciona igual em todos.'],
    ['Posso usar Claude, Gemini ou GPT?','Sim, dentro do GitHub Copilot quando esses modelos estiverem disponíveis no seu plano. O modo standalone aceita sua própria chave OpenAI ou Anthropic.'],
    ['A Taskivator vê meu trabalho?','Não. Relatórios, especificações, glossário, capturas, código, configurações e tickets não são enviados à Taskivator. Só são usados dados de licença/atualização.'],
    ['Quais dados de licença/atualização são enviados?','O login na sua conta BugIt (no navegador, no Portal), um ID de dispositivo com hash de mão única, um identificador de instalação aleatório, o nome do seu computador (hostname) e o do sistema operacional, a versão do BugIt e o filtro de plano Solo ou Team que você escolhe, material criptográfico de desafio de curta duração e o direito Solo ou Team que você aprova para este dispositivo.'],
    ['O que está incluído no Team?','O plano Team já está disponível. Um pagamento único cobre uma licença de 1 ano para até 5 membros, e cada membro tem sua própria conta BugIt, seu próprio login e sua própria ativação de dispositivo, em vez de uma licença compartilhada. A configuração da equipe é compartilhada e gerenciada de forma centralizada no Portal, e não renova automaticamente. O plano Solo não é afetado e também está disponível.'],
    ['Posso praticar sem registrar nada?','Sim. Use dry run para gerar o relatório completo sem criar tickets, comentários, anexos ou notificações. Dry run impede que os helpers integrados do BugIt escrevam e instrui o agente a recusar escritas no tracker; essa recusa segue as instruções do BugIt, não um bloqueio de plataforma, então use credenciais somente leitura ao avaliar.'],
    ['Quais arquivos posso editar com segurança?','Você pode editar config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md e .github/instructions/house-style.instructions.md se criá-lo.'],
    ['O que não devo editar manualmente?','Não edite .github/agents/bugit-qa-agent.agent.md, outros arquivos enviados em .github/instructions/ nem nada em tools/. Atualizações sobrescrevem esses arquivos do produto e eles não têm backup.'],
    ['Como funcionam as atualizações?','O BugIt faz backup dos seus arquivos de configuração, verifica atualizações assinadas, instala no lugar e preserva config, glossário, estilo, licença e conexões.'],
    ['O que acontece quando minha licença expira?','Há um período de carência de 3 dias após o fim da licença anual. Se o servidor de licenças cair, a verificação em cache permite até 72 horas de trabalho offline.'],
    ['As renovações acumulam?','Não. Uma renovação substitui sua ativação atual e inicia um novo período nessa data. Renove perto do fim do período atual.'],
    ['Como recebo suporte?','Primeiro peça ao assistente de IA para diagnosticar o problema e rode Check status ou Check readiness. Se ainda estiver com dificuldade, abra um chamado de suporte no seu painel do BugIt, sem precisar incluir detalhes confidenciais do projeto.']
  ],
  it: [
    ['BugIt crea bug automaticamente?','No. Ogni ticket, commento, allegato o notifica viene prima mostrato in anteprima. Prima di creare un ticket irreversibile, lo approvi digitando FILE IT; il solo testo della chat non crea mai nulla. Un semplice «sì» non basta. Usi dry run per esercitarsi senza alcuna scrittura.'],
    ['Quali tracker hanno mapping integrato e testato?','Tutti e undici hanno mapping dei campi integrato e testato e creano i ticket direttamente tramite l’API REST di ciascun tracker, con una credenziale che crei nel tuo account: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. La creazione non usa MCP. Strumenti di crash, gestione dei test e altri servizi si collegano ancora tramite il tuo server MCP.'],
    ['Mi serve GitHub Copilot?','GitHub Copilot è consigliato ed è la configurazione più semplice. BugIt funziona anche con l’estensione Claude in VS Code, con un altro assistente o in un semplice terminale: la creazione è un comando, quindi funziona allo stesso modo ovunque.'],
    ['Posso usare Claude, Gemini o GPT?','Sì, dentro GitHub Copilot quando quei modelli sono disponibili nel tuo piano. La modalità standalone supporta una tua chiave OpenAI o Anthropic.'],
    ['Taskivator vede il mio lavoro?','No. Report, specifiche, glossario, screenshot, codice, impostazioni e ticket non vengono inviati a Taskivator. Vengono usati solo dati di licenza/aggiornamento.'],
    ['Quali dati di licenza/aggiornamento vengono inviati?','L’accesso al suo account BugIt (nel browser, nel Portal), un ID dispositivo con hash a senso unico, un identificatore di installazione casuale, il nome del suo computer (hostname) e quello del sistema operativo, la versione di BugIt e il filtro di piano Solo o Team che sceglie, materiale crittografico di sfida di breve durata e il diritto Solo o Team che approva per questo dispositivo.'],
    ['Cosa include Team?','Il piano Team è disponibile ora. Un pagamento unico copre una licenza di 1 anno per un massimo di 5 membri: ogni membro ha il proprio account BugIt, il proprio login e la propria attivazione del dispositivo, invece di una licenza condivisa. La configurazione del team è condivisa e gestita centralmente nel Portale e non si rinnova automaticamente. Il piano Solo non è interessato ed è disponibile anch’esso.'],
    ['Posso fare pratica senza inviare?','Sì. Usa dry run per generare il report completo senza creare ticket, commenti, allegati o notifiche. Dry run impedisce ai helper integrati di BugIt di scrivere e dice all’agente di rifiutare le scritture sul tracker; quel rifiuto segue le istruzioni di BugIt, non un blocco della piattaforma, quindi usa credenziali di sola lettura durante la valutazione.'],
    ['Quali file posso modificare in sicurezza?','Puoi modificare config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md e .github/instructions/house-style.instructions.md se lo crei.'],
    ['Cosa non devo modificare a mano?','Non modificare .github/agents/bugit-qa-agent.agent.md, altri file distribuiti in .github/instructions/ o qualsiasi cosa in tools/. Gli aggiornamenti sovrascrivono questi file del prodotto e non sono inclusi nei backup.'],
    ['Come funzionano gli aggiornamenti?','BugIt esegue il backup dei file di configurazione di tua proprietà, verifica gli aggiornamenti firmati, installa sul posto e conserva config, glossario, stile, licenza e connessioni.'],
    ['Cosa succede quando la licenza scade?','Dopo il termine annuale c’è un periodo di grazia di 3 giorni. Se il server licenze non è raggiungibile, la verifica in cache permette fino a 72 ore di lavoro offline.'],
    ['I rinnovi si sommano?','No. Un rinnovo sostituisce la tua attivazione corrente e avvia un nuovo periodo da quella data. Rinnova vicino alla fine del periodo attuale.'],
    ['Come ricevo supporto?','Prima chiedi all’assistente IA di diagnosticare il problema, poi esegui Check status o Check readiness. Se sei ancora bloccato, apri un ticket di supporto dalla tua dashboard BugIt, senza bisogno di includere dati riservati del progetto.']
  ],
  ko: [
    ['BugIt이 자동으로 버그를 등록하나요?','아니요. 모든 티켓, 댓글, 첨부, 알림은 먼저 미리 보기로 표시됩니다. 되돌릴 수 없는 티켓 등록 전에는 FILE IT을 입력해 승인해야 하며, 채팅 문구만으로는 등록되지 않습니다. 단순히 "예"만으로는 진행되지 않습니다.'],
    ['내장 검증 매핑이 있는 트래커는 무엇인가요?','열한 개 모두 내장 검증 필드 매핑을 제공하며, 직접 만든 자격 증명으로 각 추적기의 REST API에 바로 등록합니다: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana, Trello. 등록에는 MCP를 사용하지 않습니다. 크래시 도구와 테스트 관리 등 다른 서비스는 여전히 사용자의 MCP 서버를 통해 연결합니다.'],
    ['GitHub Copilot이 필요한가요?','GitHub Copilot이 가장 쉽고 권장되는 설정입니다. BugIt은 사용자의 OpenAI 또는 Anthropic 키로 standalone 모드도 실행할 수 있습니다.'],
    ['Claude, Gemini 또는 GPT를 사용할 수 있나요?','네. GitHub Copilot에서 해당 모델이 플랜에 제공되는 경우 사용할 수 있습니다. standalone 모드는 사용자의 OpenAI 또는 Anthropic 키를 지원합니다.'],
    ['Taskivator가 제 작업을 보나요?','아니요. 버그 리포트, 사양, 용어집, 스크린샷, 코드, 설정, 티켓은 Taskivator로 전송되지 않습니다. 라이선스/업데이트 데이터만 사용됩니다.'],
    ['어떤 라이선스/업데이트 데이터가 전송되나요?','브라우저의 Portal에서 이루어지는 BugIt 계정 로그인, 단방향 해시된 기기 ID, 무작위 설치 식별자, 기기 이름(호스트명)과 운영체제 이름, BugIt 버전과 선택한 Solo 또는 Team 플랜 필터, 수명이 짧은 암호화 챌린지 자료, 그리고 이 기기에 대해 승인하는 Solo 또는 Team 권한입니다.'],
    ['Team에는 무엇이 포함되나요?','BugIt Team을 지금 이용할 수 있습니다. 1회 결제로 최대 5명을 위한 1년 라이선스를 제공합니다. 공유 라이선스 대신 각 구성원이 자신의 BugIt 계정, 자신의 로그인, 자신의 기기 활성화를 갖습니다. 팀 구성은 공유되며 포털에서 중앙 관리되고, 자동 갱신이 없습니다. Solo 요금제는 영향을 받지 않으며 함께 이용할 수 있습니다.'],
    ['등록 없이 연습할 수 있나요?','네. dry run을 사용하면 티켓, 댓글, 첨부, 알림을 만들지 않고 전체 리포트를 생성할 수 있습니다. dry run은 BugIt에 포함된 도우미의 쓰기를 막고 에이전트에 트래커 쓰기를 거부하도록 지시합니다. 이 거부는 플랫폼 잠금이 아니라 BugIt의 지시를 따르므로, 평가할 때는 읽기 전용 자격 증명을 사용하세요.'],
    ['안전하게 수정할 수 있는 파일은 무엇인가요?','config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md, 그리고 직접 만든 .github/instructions/house-style.instructions.md는 안전하게 수정할 수 있습니다.'],
    ['직접 수정하면 안 되는 것은 무엇인가요?','.github/agents/bugit-qa-agent.agent.md, 배포된 .github/instructions/ 내 다른 파일, tools/ 안의 파일은 직접 수정하지 마세요. 업데이트가 이 제품 파일들을 덮어쓰며 백업되지 않습니다.'],
    ['업데이트는 어떻게 작동하나요?','BugIt은 사용자가 소유한 설정 파일을 백업하고, 서명된 업데이트를 검증한 뒤, config, 용어집, house style, 라이선스, 연결을 유지하며 제자리에서 설치합니다.'],
    ['라이선스가 만료되면 어떻게 되나요?','라이선스 기간이 끝나면 3일의 유예 기간이 적용되며, 그 이후 등록과 활성화에는 유효한 라이선스가 필요합니다. 로컬 파일과 설정은 그대로 유지됩니다. 라이선스 서버 장애 시에는 캐시된 검증으로 최대 72시간 오프라인 작업이 가능합니다.'],
    ['갱신 기간이 누적되나요?','아니요. 갱신하면 현재 활성화를 대체하고 그 날짜부터 새 기간이 시작됩니다. 현재 기간이 끝날 때쯤 갱신하세요.'],
    ['지원은 어떻게 받나요?','먼저 AI 어시스턴트에게 문제 진단을 요청하고 Check status 또는 Check readiness를 실행하세요. 그래도 해결되지 않으면 BugIt 대시보드에서 지원 티켓을 등록하세요. 기밀 프로젝트 정보는 포함하지 않아도 됩니다.']
  ],
  zh: [
    ['BugIt 会自动提交缺陷吗？','不会。每个工单、评论、附件或通知都会先预览。执行不可撤销的工单提交前，需要输入 FILE IT 进行批准；仅靠聊天文字永远不会提交。仅输入"是"不会执行操作。'],
    ['哪些跟踪器有内置且已测试的字段映射？','全部十一个都提供内置且已测试的字段映射，并使用你在自己账户中创建的凭据，直接通过各自的 REST API 提交：Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana 和 Trello。提交不使用 MCP。崩溃工具、测试管理等其他服务仍通过你自己的 MCP 服务器连接。'],
    ['我需要 GitHub Copilot 吗？','推荐使用 GitHub Copilot，它是最简单的设置方式。BugIt 也支持 VS Code 中的 Claude 扩展、其他助手或普通终端：提交是一条命令，因此在它们中的使用方式完全相同。'],
    ['可以使用 Claude、Gemini 或 GPT 吗？','可以。在 GitHub Copilot 中，如果你的计划提供这些模型，就可以使用。standalone 模式支持你自己的 OpenAI 或 Anthropic 密钥。'],
    ['Taskivator 会看到我的工作内容吗？','不会。缺陷报告、规格、术语表、截图、代码、设置和工单都不会发送给 Taskivator。只会使用许可证/更新数据。'],
    ['会发送哪些许可证/更新数据？','在浏览器 Portal 中登录你的 BugIt 账户、一个单向哈希的设备 ID、一个随机安装标识符、你的设备名（主机名）与操作系统名称、BugIt 版本与你选择的 Solo 或 Team 套餐筛选、短时有效的加密质询材料，以及你为这台设备批准的 Solo 或 Team 权益。'],
    ['Team 包含什么？','BugIt Team 现已推出。一次性付款即可获得适用于最多 5 名成员的 1 年期许可证：每位成员都拥有各自的 BugIt 账户、各自的登录和各自的设备激活，而不是共享一个许可证。团队配置为共享，并在门户中集中管理，且不自动续订。Solo 套餐不受影响，同样可用。'],
    ['可以不提交就练习吗？','可以。使用 dry run 可以生成完整报告，而不会创建工单、评论、附件或通知。 dry run 会阻止 BugIt 内置的辅助工具写入，并指示代理拒绝对跟踪器的写入；这种拒绝遵循的是 BugIt 的指令而非平台级锁定，因此评估时请使用只读凭据。'],
    ['哪些文件可以安全编辑？','可以安全编辑 config.json、.vscode/mcp.json、.github/glossary/terms.template.md、.github/instructions/learned.instructions.md，以及你自己创建的 .github/instructions/house-style.instructions.md。'],
    ['哪些内容不应手动编辑？','不要手动编辑 .github/agents/bugit-qa-agent.agent.md、.github/instructions/ 下随产品提供的其他文件，或 tools/ 中的任何文件。更新会覆盖这些产品文件，而且不会备份。'],
    ['更新如何工作？','BugIt 会备份你拥有的设置文件，验证已签名的更新，就地安装，并保留配置、术语表、团队风格、许可证和连接。'],
    ['许可证到期后会怎样？','许可证期限结束后有 3 天宽限期，此后提交和激活功能需要有效的许可证。你的本地文件和设置仍归你所有。许可证服务器故障是另一种情况：缓存验证允许最多 72 小时离线继续工作。'],
    ['续订会叠加吗？','不会。续订会替换当前的激活，并从该日期开始新的期限。请在当前期限接近结束时续订。'],
    ['如何获得支持？','先让 AI 助手诊断问题，然后运行 Check status 或 Check readiness。如果仍需帮助，请从 BugIt 仪表盘提交支持工单，无需包含机密项目信息。']
  ],
  ru: [
    ['BugIt автоматически создает баги?','Нет. Каждый тикет, комментарий, вложение и уведомление сначала показывается для предпросмотра. Перед необратимым созданием тикета вы подтверждаете его вводом FILE IT; один только текст в чате никогда ничего не создаёт. Обычного «да» недостаточно. Используйте dry run, чтобы тренироваться без записи.'],
    ['Какие трекеры имеют встроенное проверенное сопоставление?','Встроенное проверенное сопоставление полей есть у всех одиннадцати, и тикеты создаются напрямую через собственный REST API каждого трекера с учётными данными, которые вы создаёте в своём аккаунте: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana и Trello. MCP для этого не используется. Инструменты для сбоев, управление тестами и прочие сервисы по-прежнему подключаются через ваш собственный MCP-сервер.'],
    ['Нужен ли GitHub Copilot?','GitHub Copilot рекомендуется и является самым простым вариантом. BugIt также работает с расширением Claude в VS Code, с другим ассистентом или в обычном терминале: создание тикета выполняется командой, поэтому везде работает одинаково.'],
    ['Можно ли использовать Claude, Gemini или GPT?','Да, внутри GitHub Copilot, если эти модели доступны в вашем плане. Автономный режим поддерживает ваш ключ OpenAI или Anthropic.'],
    ['Taskivator видит мою работу?','Нет. Баг-репорты, спецификации, глоссарий, скриншоты, код, настройки и тикеты не отправляются в Taskivator. Используются только данные лицензии/обновлений.'],
    ['Какие данные лицензии/обновлений отправляются?','Вход в вашу учётную запись BugIt (в браузере, на Portal), односторонний хешированный идентификатор устройства, случайный идентификатор установки, имя вашего устройства (hostname) и название операционной системы, версию BugIt и выбранный вами фильтр плана Solo или Team, недолговечный криптографический материал запроса-ответа, а также право Solo или Team, которое вы подтверждаете для этого устройства.'],
    ['Что входит в Team?','Тариф Team уже доступен. Разовый платёж включает лицензию на 1 год для команды до 5 участников, у каждого участника собственный аккаунт BugIt, собственный вход и собственная активация устройства вместо общей лицензии. Конфигурация команды общая и управляется централизованно в Портале, без автопродления. Тариф Solo не затронут и также доступен.'],
    ['Можно ли практиковаться без создания тикетов?','Да. Используйте dry run, чтобы создать полный отчет без тикетов, комментариев, вложений или уведомлений. Dry run не даёт встроенным помощникам BugIt выполнять запись и указывает агенту отклонять запись в трекер; этот отказ следует инструкциям BugIt, а не блокировке платформы, поэтому при проверке используйте учётные данные только для чтения.'],
    ['Какие файлы безопасно редактировать?','Безопасно редактировать config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md и .github/instructions/house-style.instructions.md, если вы его создадите.'],
    ['Что нельзя редактировать вручную?','Не редактируйте .github/agents/bugit-qa-agent.agent.md, другие поставляемые файлы в .github/instructions/ и любые файлы в tools/. Обновления перезаписывают эти файлы продукта, и они не входят в резервную копию.'],
    ['Как работают обновления?','BugIt создает резервную копию ваших настроек, проверяет подписанные обновления, устанавливает их на месте и сохраняет config, глоссарий, house style, лицензию и подключения.'],
    ['Что происходит после истечения лицензии?','После окончания годового срока есть 3-дневный льготный период. Если сервер лицензий недоступен, кэшированная проверка позволяет работать офлайн до 72 часов.'],
    ['Суммируются ли продления?','Нет. Продление заменяет вашу текущую активацию и запускает новый срок с этой даты. Продлевайте ближе к концу текущего срока.'],
    ['Как получить поддержку?','Сначала попросите AI-ассистента диагностировать проблему, затем выполните Check status или Check readiness. Если решить не удалось, создайте обращение в поддержку в личном кабинете BugIt. Конфиденциальные данные проекта указывать не нужно.']
  ]
};
const bugitV16DocPages = {
  en: {
    homeIntro:'Everything you need to install, activate, customize and use BugIt safely. Updated for BugIt QA Agent.',
    supportIntro:'For setup issues, first ask the BugIt assistant to diagnose the problem, then run Check status or Check readiness. If you still need help, open a support ticket from your BugIt dashboard.',
    before:'Before opening a support ticket',
    beforeText:'Do not include confidential source code, customer data, private tickets, screenshots, tokens or secrets. Describe the BugIt problem in general terms.',
    sections:[
      'Install VS Code and GitHub Copilot, unzip BugIt, open the BugIt folder, pick BugIt QA Agent in Copilot Chat, activate your license, accept the terms once, then type Begin setup. BugIt asks plain-language questions, writes config.json for you, helps connect your tracker bridge, and Check readiness confirms when you are ready.',
      'Everyday use is chat-first: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings and Update. Use dry run whenever you want a full report without creating tickets, comments, attachments or notifications. Safe customization lives in config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md and .github/instructions/house-style.instructions.md if you create it. Do not hand-edit the core agent, shipped instruction files or tools folder; updates overwrite those product files and they are not backed up.',
      'BugIt is licensed, not sold. Solo allows 1 device at a time. Team allows up to 5 members, each with their own account and device. Your account and its entitlement may not be shared, published, resold, sublicensed or transferred. You may customize configuration, glossary, templates and your own instruction files, but you may not bypass licensing, activation, seat limits or update verification. BugIt is a one-time purchase that does not auto-renew: it grants a one-year license from first activation with a 3-day grace period after expiry. This agreement is governed by the laws of Japan. Claims may be brought in the courts of Japan, and if you are a consumer this does not affect your right to bring proceedings in your country of residence.',
      'BugIt sends Taskivator only licensing and update data: your Portal sign-in; an anonymous, one-way hashed device identifier; a random installation identifier; your device label and operating system; the BugIt version and selected plan; short-lived cryptographic challenge data; and the entitlement approved for this device. The BugIt software does not use Google Ads measurement or send product telemetry. (This website itself uses Cloudflare Web Analytics for performance.) Your reports, specs, glossary, house style, learned corrections, local files and tokens stay on your device. Report text goes only to the AI model and tracker you choose and connect.'
    ]
  },
  ja: {homeIntro:'BugIt QA Agent に合わせた、インストール、認証、カスタマイズ、安全な利用のためのドキュメントです。',supportIntro:'セットアップで困ったら、まずBugItアシスタントに診断を依頼し、Check status または Check readiness を実行してください。それでも解決しない場合は、BugItダッシュボードからサポートチケットを送信してください。',before:'サポートチケットを送信する前に',beforeText:'機密コード、顧客データ、非公開チケット、スクリーンショット、トークン、秘密情報は含めないでください。BugItの問題を一般的な内容で説明してください。',sections:['VS Code と GitHub Copilot をインストールし、BugItを展開してフォルダを開き、Copilot ChatでBugIt QA Agentを選び、ライセンスを有効化し、初回のみ利用条件に同意してから Begin setup と入力します。BugItが質問し、config.jsonを作成し、トラッカーへの接続を案内し、Check readinessで準備完了を確認します。','普段はチャットで使います: Write a bug report、Quick bug、Write a crash bug report、Translate、Close #ID、Check status、Check readiness、Back up my settings、Restore my settings、Update。書き込みなしで練習するには dry run を使います。安全にカスタマイズできるのは config.json、.vscode/mcp.json、.github/glossary/terms.template.md、.github/instructions/learned.instructions.md、作成した場合の .github/instructions/house-style.instructions.md です。コアエージェント、出荷済みinstruction、toolsフォルダは手動編集しないでください。更新で上書きされ、バックアップされません。','BugItは販売ではなくライセンス提供です。Soloは同時に1デバイス、Teamは最大5メンバーで、各メンバーが自分のアカウントとデバイスを持ちます。アカウントおよびその利用権（エンタイトルメント）の共有、公開、再販売、サブライセンス、譲渡は禁止です。設定、用語集、テンプレート、自分のinstructionファイルはカスタマイズできますが、ライセンス、認証、座席制限、更新検証の回避は禁止です。BugItは自動更新のない一回限りの買い切り購入です。購入により、初回有効化から始まる1年間のライセンスが付与され、期限後は3日間の猶予期間があります。本契約には日本法が適用されます。請求は日本の裁判所に提起することができます。お客様が消費者である場合、これは居住国の裁判所で手続を行う権利に影響しません。','Taskivatorへ送信されるのはライセンス/更新データのみです: ブラウザーの Portal での BugIt アカウントへのサインイン、一方向でハッシュ化されたデバイス ID、ランダムなインストール識別子、デバイス名（ホスト名）と OS 名、BugIt のバージョンと選択した Solo／Team のプランフィルター、短時間だけ有効な暗号チャレンジ、そしてこのデバイスに対して承認する Solo または Team の権利。BugIt ソフトウェアは、Google Ads の計測を使用せず、製品テレメトリも送信しません。（本ウェブサイト自体はパフォーマンスのために Cloudflare Web Analytics を使用します。）レポート、仕様、用語集、ハウススタイル、学習内容、ローカルファイル、トークンは端末上に残ります。レポート本文は、あなたが選んで接続したAIモデルとトラッカーにのみ送られます。']},
  es: {homeIntro:'Documentación actualizada para BugIt QA Agent: instalación, activación, personalización y uso seguro.',supportIntro:'Si tienes problemas de configuración, primero pide al asistente de BugIt que diagnostique el problema y ejecuta Check status o Check readiness. Si aún necesitas ayuda, abre un ticket de soporte desde tu panel de BugIt.',before:'Antes de abrir un ticket de soporte',beforeText:'No incluyas código fuente confidencial, datos de clientes, tickets privados, capturas, tokens ni secretos. Describe el problema de BugIt en términos generales.',sections:['Instala VS Code y GitHub Copilot, descomprime BugIt, abre la carpeta, elige BugIt QA Agent en Copilot Chat, activa tu licencia, acepta los términos una vez y escribe Begin setup. BugIt hace preguntas sencillas, escribe config.json, te ayuda a conectar el puente del tracker y Check readiness confirma que todo está listo.','El uso diario es por chat: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings y Update. Usa dry run para generar un reporte completo sin crear tickets, comentarios, adjuntos ni notificaciones. La personalización segura vive en config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md y .github/instructions/house-style.instructions.md si lo creas. No edites a mano el agente principal, los archivos de instrucciones incluidos ni la carpeta tools; las actualizaciones los sobrescriben y no se respaldan.','BugIt se licencia, no se vende. Solo permite 1 dispositivo a la vez. Team permite hasta 5 miembros, cada uno con su propia cuenta y dispositivo. Tu cuenta y su derecho de uso no se pueden compartir, publicar, revender, sublicenciar ni transferir. Puedes personalizar configuración, glosario, plantillas y tus propios archivos de instrucciones, pero no puedes saltarte licencia, activación, límites de asientos ni verificación de actualizaciones. BugIt es una compra única que no se renueva automáticamente: concede una licencia de un año desde la primera activación, con un periodo de gracia de 3 días tras expirar. Este contrato se rige por las leyes de Japón. Las reclamaciones podrán presentarse ante los tribunales de Japón; si usted es consumidor, ello no afecta a su derecho a acudir a los tribunales de su país de residencia.','Taskivator solo recibe datos de licencia/actualización: el inicio de sesión en su cuenta de BugIt (en el navegador, en el Portal), un identificador de dispositivo con hash unidireccional, un identificador de instalación aleatorio, el nombre de su equipo (hostname) y el del sistema operativo, la versión de BugIt y el filtro de plan Solo o Team que elija, material criptográfico de desafío de corta duración y la titularidad Solo o Team que aprueba para este dispositivo. El software BugIt no utiliza la medición de Google Ads ni envía telemetría del producto. (Este sitio web usa Cloudflare Web Analytics para el rendimiento.) Tus reportes, specs, glosario, estilo, correcciones aprendidas, archivos locales y tokens permanecen en tu dispositivo. El texto del reporte solo va al modelo de IA y al tracker que eliges y conectas.']},
  fr: {homeIntro:'Documentation mise à jour pour BugIt QA Agent : installation, activation, personnalisation et utilisation sûre.',supportIntro:'En cas de problème de configuration, demandez d’abord à l’assistant BugIt de diagnostiquer le problème, puis lancez Check status ou Check readiness. Si vous avez encore besoin d’aide, ouvrez un ticket de support depuis votre tableau de bord BugIt.',before:'Avant d’ouvrir un ticket de support',beforeText:'N’incluez pas de code source confidentiel, données client, tickets privés, captures, tokens ou secrets. Décrivez le problème BugIt en termes généraux.',sections:['Installez VS Code et GitHub Copilot, décompressez BugIt, ouvrez le dossier, choisissez BugIt QA Agent dans Copilot Chat, activez votre licence, acceptez les conditions une fois, puis tapez Begin setup. BugIt pose des questions simples, écrit config.json, aide à connecter le pont du tracker, et Check readiness confirme que tout est prêt.','L’usage quotidien se fait dans le chat : Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings et Update. Utilisez dry run pour obtenir un rapport complet sans créer de tickets, commentaires, pièces jointes ni notifications. Les personnalisations sûres sont config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md et .github/instructions/house-style.instructions.md si vous le créez. Ne modifiez pas à la main l’agent central, les instructions livrées ou le dossier tools ; les mises à jour les écrasent et ils ne sont pas sauvegardés.','BugIt est concédé sous licence, non vendu. Solo autorise 1 appareil à la fois. Team autorise jusqu’à 5 membres, chacun avec son propre compte et appareil. Votre compte et son droit d’utilisation ne peuvent pas être partagés, publiés, revendus, sous-licenciés ou transférés. Vous pouvez personnaliser configuration, glossaire, modèles et vos propres fichiers d’instructions, mais pas contourner la licence, l’activation, les limites de sièges ou la vérification des mises à jour. BugIt est un achat unique sans reconduction automatique : il accorde une licence d’un an à partir de la première activation, avec une période de grâce de 3 jours après expiration. Le présent contrat est régi par le droit japonais. Les réclamations peuvent être portées devant les tribunaux du Japon ; si vous êtes un consommateur, cela ne porte pas atteinte à votre droit d’agir devant les tribunaux de votre pays de résidence.','Taskivator ne reçoit que les données de licence/mise à jour : la connexion à votre compte BugIt (dans le navigateur, sur le Portal), un identifiant d’appareil haché à sens unique, un identifiant d’installation aléatoire, le nom de votre machine (hostname) et celui du système d’exploitation, la version de BugIt et le filtre d’offre Solo ou Team que vous choisissez, un matériel cryptographique de défi à durée de vie courte, et le droit Solo ou Team que vous approuvez pour cet appareil. Le logiciel BugIt n’utilise pas la mesure Google Ads et n’envoie aucune télémétrie produit. (Ce site web utilise Cloudflare Web Analytics pour les performances.) Vos rapports, specs, glossaire, style, corrections apprises, fichiers locaux et tokens restent sur votre appareil. Le texte du rapport va seulement au modèle IA et au tracker que vous choisissez et connectez.']},
  de: {homeIntro:'Aktualisierte Dokumentation für BugIt QA Agent: Installation, Aktivierung, Anpassung und sichere Nutzung.',supportIntro:'Bei Setup-Problemen bitten Sie zuerst den BugIt-Assistenten um Diagnose und führen Check status oder Check readiness aus. Wenn Sie weiterhin Hilfe benötigen, öffnen Sie über Ihr BugIt-Dashboard ein Support-Ticket.',before:'Bevor Sie ein Support-Ticket öffnen',beforeText:'Geben Sie keinen vertraulichen Quellcode und keine Kundendaten, privaten Tickets, Screenshots, Tokens oder Secrets an. Beschreiben Sie das BugIt-Problem allgemein.',sections:['Installieren Sie VS Code und GitHub Copilot, entpacken Sie BugIt, öffnen Sie den Ordner, wählen Sie BugIt QA Agent in Copilot Chat, aktivieren Sie Ihre Lizenz, akzeptieren Sie einmal die Bedingungen und geben Sie Begin setup ein. BugIt stellt einfache Fragen, schreibt config.json, hilft beim Verbinden der Tracker-Bridge und Check readiness bestätigt die Bereitschaft.','Die tägliche Nutzung läuft über Chat: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings und Update. Mit dry run erstellen Sie einen vollständigen Bericht ohne Tickets, Kommentare, Anhänge oder Benachrichtigungen. Sicher anpassbar sind config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md und .github/instructions/house-style.instructions.md, falls Sie sie erstellen. Bearbeiten Sie nicht den Kern-Agenten, ausgelieferte Instruction-Dateien oder den Ordner tools; Updates überschreiben diese Dateien und sie werden nicht gesichert.','BugIt wird lizenziert, nicht verkauft. Solo erlaubt 1 Gerät gleichzeitig. Team erlaubt bis zu 5 Mitglieder, jeweils mit eigenem Konto und Gerät. Ihr Konto und seine Berechtigung dürfen nicht geteilt, veröffentlicht, weiterverkauft, unterlizenziert oder übertragen werden. Konfiguration, Glossar, Vorlagen und eigene Instruction-Dateien dürfen Sie anpassen, aber Lizenzierung, Aktivierung, Sitzplatzlimits und Update-Prüfung nicht umgehen. BugIt ist ein einmaliger Kauf ohne automatische Verlängerung: Der Kauf gewährt eine einjährige Lizenz ab Erstaktivierung mit einer Schonfrist von 3 Tagen nach Ablauf. Dieser Vertrag unterliegt japanischem Recht. Ansprüche können vor den Gerichten Japans geltend gemacht werden; wenn Sie Verbraucher sind, berührt dies nicht Ihr Recht, in Ihrem Wohnsitzland Klage zu erheben.','Taskivator erhält nur Lizenz-/Update-Daten: die Anmeldung bei Ihrem BugIt-Konto (im Browser, im Portal), eine mit einem Einweg-Hash versehene Geräte-ID, eine zufällige Installationskennung, den Namen Ihres Geräts (Hostname) und des Betriebssystems, die BugIt-Version und den von Ihnen gewählten Solo- oder Team-Planfilter, kurzlebiges kryptografisches Challenge-Material und die Solo- oder Team-Berechtigung, die Sie für dieses Gerät bestätigen. Die BugIt-Software verwendet keine Google Ads-Messung und sendet keine Produkttelemetrie. (Diese Website selbst nutzt Cloudflare Web Analytics für die Leistung.) Reports, Spezifikationen, Glossar, Hausstil, gelernte Korrekturen, lokale Dateien und Tokens bleiben auf Ihrem Gerät. Berichtstext geht nur an das von Ihnen gewählte KI-Modell und den verbundenen Tracker.']},
  'pt-br': {homeIntro:'Documentação atualizada para o BugIt QA Agent: instalação, ativação, personalização e uso seguro.',supportIntro:'Para problemas de configuração, primeiro peça ao assistente do BugIt para diagnosticar o problema e rode Check status ou Check readiness. Se ainda precisar de ajuda, abra um chamado de suporte no seu painel do BugIt.',before:'Antes de abrir um chamado de suporte',beforeText:'Não inclua código-fonte confidencial, dados de clientes, tickets privados, capturas, tokens ou segredos. Descreva o problema do BugIt em termos gerais.',sections:['Instale VS Code e GitHub Copilot, descompacte o BugIt, abra a pasta, escolha BugIt QA Agent no Copilot Chat, ative sua licença, aceite os termos uma vez e digite Begin setup. O BugIt faz perguntas simples, grava config.json, ajuda a conectar seu rastreador e Check readiness confirma quando está pronto.','O uso diário é pelo chat: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings e Update. Use dry run para gerar um relatório completo sem criar tickets, comentários, anexos ou notificações. Personalização segura fica em config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md e .github/instructions/house-style.instructions.md se você criar. Não edite manualmente o agente principal, arquivos de instruções enviados ou a pasta tools; atualizações sobrescrevem esses arquivos e eles não têm backup.','O BugIt é licenciado, não vendido. Solo permite 1 dispositivo por vez. Team permite até 5 membros, cada um com sua própria conta e dispositivo. Sua conta e seu direito de uso não podem ser compartilhados, publicados, revendidos, sublicenciados ou transferidos. Você pode personalizar configuração, glossário, modelos e seus próprios arquivos de instruções, mas não pode contornar licença, ativação, limites de seats ou verificação de atualização. O BugIt é uma compra única que não se renova automaticamente: concede uma licença de um ano a partir da primeira ativação, com um período de carência de 3 dias após expirar. Este contrato é regido pelas leis do Japão. As reivindicações podem ser propostas nos tribunais do Japão; se você for consumidor, isso não afeta seu direito de propor ação nos tribunais do seu país de residência.','A Taskivator recebe apenas dados de licença/atualização: o login na sua conta BugIt (no navegador, no Portal), um ID de dispositivo com hash de mão única, um identificador de instalação aleatório, o nome do seu computador (hostname) e o do sistema operacional, a versão do BugIt e o filtro de plano Solo ou Team que você escolhe, material criptográfico de desafio de curta duração e o direito Solo ou Team que você aprova para este dispositivo. O software BugIt não usa a medição do Google Ads nem envia telemetria do produto. (Este site usa o Cloudflare Web Analytics para desempenho.) Relatórios, specs, glossário, estilo, correções aprendidas, arquivos locais e tokens ficam no seu dispositivo. O texto do relatório vai apenas para o modelo de IA e o tracker que você escolheu e conectou.']},
  it: {homeIntro:'Documentazione aggiornata per BugIt QA Agent: installazione, attivazione, personalizzazione e uso sicuro.',supportIntro:'Per problemi di setup, chiedi prima all’assistente BugIt di diagnosticare il problema, poi esegui Check status o Check readiness. Se serve ancora aiuto, apri un ticket di supporto dalla tua dashboard BugIt.',before:'Prima di aprire un ticket di supporto',beforeText:'Non includere codice sorgente riservato, dati clienti, ticket privati, screenshot, token o segreti. Descrivi il problema di BugIt in termini generali.',sections:['Installa VS Code e GitHub Copilot, decomprimi BugIt, apri la cartella, scegli BugIt QA Agent in Copilot Chat, attiva la licenza, accetta i termini una volta e digita Begin setup. BugIt fa domande semplici, scrive config.json, aiuta a collegare il tracker e Check readiness conferma quando sei pronto.','L’uso quotidiano è via chat: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings e Update. Usa dry run per generare un report completo senza creare ticket, commenti, allegati o notifiche. La personalizzazione sicura vive in config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md e .github/instructions/house-style.instructions.md se lo crei. Non modificare a mano l’agente core, i file instruction distribuiti o la cartella tools; gli aggiornamenti li sovrascrivono e non sono inclusi nei backup.','BugIt è concesso in licenza, non venduto. Solo consente 1 dispositivo alla volta. Team consente fino a 5 membri, ciascuno con il proprio account e dispositivo. Il tuo account e il relativo diritto d’uso non possono essere condivisi, pubblicati, rivenduti, sublicenziati o trasferiti. Puoi personalizzare configurazione, glossario, template e i tuoi file instruction, ma non puoi aggirare licenza, attivazione, limiti di seat o verifica aggiornamenti. BugIt è un acquisto una tantum che non si rinnova automaticamente: concede una licenza di un anno dalla prima attivazione, con un periodo di grazia di 3 giorni dopo la scadenza. Il presente contratto è regolato dalla legge giapponese. Le richieste possono essere presentate ai tribunali del Giappone; se è un consumatore, ciò non pregiudica il suo diritto di agire davanti ai tribunali del suo paese di residenza.','Taskivator riceve solo dati di licenza/aggiornamento: l’accesso al suo account BugIt (nel browser, nel Portal), un ID dispositivo con hash a senso unico, un identificatore di installazione casuale, il nome del suo computer (hostname) e quello del sistema operativo, la versione di BugIt e il filtro di piano Solo o Team che sceglie, materiale crittografico di sfida di breve durata e il diritto Solo o Team che approva per questo dispositivo. Il software BugIt non utilizza la misurazione di Google Ads né invia telemetria del prodotto. (Questo sito web usa Cloudflare Web Analytics per le prestazioni.) Report, specifiche, glossario, stile, correzioni apprese, file locali e token restano sul tuo dispositivo. Il testo del report va solo al modello IA e al tracker che scegli e colleghi.']},
  ko: {homeIntro:'BugIt을 설치, 활성화, 사용자 지정하고 안전하게 사용하는 데 필요한 모든 내용을 담았습니다. BugIt QA Agent 기준으로 업데이트되었습니다.',supportIntro:'설정 문제가 있으면 먼저 BugIt 어시스턴트에게 진단을 요청한 뒤 Check status 또는 Check readiness를 실행하세요. 그래도 도움이 필요하면 BugIt 대시보드에서 지원 티켓을 등록하세요.',before:'지원 티켓을 등록하기 전에',beforeText:'기밀 소스 코드, 고객 데이터, 비공개 티켓, 스크린샷, 토큰 또는 비밀 정보를 포함하지 마세요. BugIt 문제를 개괄적으로 설명하세요.',sections:['VS Code와 GitHub Copilot을 설치하고, BugIt을 압축 해제한 뒤 폴더를 열고, Copilot Chat에서 BugIt QA Agent를 선택하고, 라이선스를 활성화하고, 약관에 한 번 동의한 다음 Begin setup을 입력하세요. BugIt은 쉬운 질문을 하고 config.json을 작성하며 트래커 브리지를 연결하도록 돕고 Check readiness로 준비 상태를 확인합니다.','일상 사용은 채팅 중심입니다: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings, Update. dry run을 사용하면 티켓, 댓글, 첨부, 알림 없이 전체 리포트를 생성할 수 있습니다. 안전한 사용자 지정 파일은 config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md, 직접 만든 .github/instructions/house-style.instructions.md입니다. 핵심 agent, 배포된 instruction 파일, tools 폴더는 직접 수정하지 마세요. 업데이트가 덮어쓰며 백업되지 않습니다.','BugIt은 판매가 아니라 라이선스로 제공됩니다. Solo는 동시에 기기 1대를 허용하고, Team은 최대 5명으로 각 구성원이 자신의 계정과 기기를 가집니다. 계정과 그 이용 권한은 공유, 공개, 재판매, 재라이선스 또는 양도할 수 없습니다. 설정, 용어집, 템플릿, 사용자 instruction 파일은 사용자 지정할 수 있지만 라이선스, 활성화, seat 제한 또는 업데이트 검증을 우회할 수 없습니다. BugIt은 자동 갱신이 없는 일회성 구매입니다. 구매 시 첫 활성화부터 1년 라이선스가 부여되며, 만료 후 3일의 유예 기간이 있습니다. 본 계약은 일본 법률의 적용을 받습니다. 청구는 일본 법원에 제기할 수 있으며, 소비자인 경우 이는 거주 국가의 법원에 소송을 제기할 권리에 영향을 주지 않습니다.','Taskivator로 전송되는 것은 라이선스/업데이트 데이터뿐입니다: 브라우저의 Portal에서 이루어지는 BugIt 계정 로그인, 단방향 해시된 기기 ID, 무작위 설치 식별자, 기기 이름(호스트명)과 운영체제 이름, BugIt 버전과 선택한 Solo 또는 Team 플랜 필터, 수명이 짧은 암호화 챌린지 자료, 그리고 이 기기에 대해 승인하는 Solo 또는 Team 권한입니다. BugIt 소프트웨어는 Google Ads 측정을 사용하지 않으며 제품 텔레메트리도 전송하지 않습니다. (이 웹사이트 자체는 성능을 위해 Cloudflare Web Analytics를 사용합니다.) 리포트, 사양, 용어집, house style, 학습된 수정, 로컬 파일, 토큰은 기기에 남습니다. 리포트 텍스트는 사용자가 선택하고 연결한 AI 모델과 트래커로만 이동합니다.']},
  zh: {homeIntro:'BugIt QA Agent 的最新文档：安装、激活、自定义和安全使用。',supportIntro:'遇到设置问题时，先让 BugIt 助手诊断问题，然后运行 Check status 或 Check readiness。如果仍需要帮助，请从 BugIt 仪表盘提交支持工单。',before:'提交支持工单前',beforeText:'不要包含机密源代码、客户数据、私有工单、截图、令牌或密钥。请用一般方式描述 BugIt 问题。',sections:['安装 VS Code 和 GitHub Copilot，解压 BugIt，打开 BugIt 文件夹，在 Copilot Chat 中选择 BugIt QA Agent，激活许可证，首次接受条款，然后输入 Begin setup。BugIt 会用自然语言提问，为你写入 config.json，帮助连接你的跟踪系统，并通过 Check readiness 确认准备就绪。','日常使用以聊天为主：Write a bug report、Quick bug、Write a crash bug report、Translate、Close #ID、Check status、Check readiness、Back up my settings、Restore my settings 和 Update。使用 dry run 可以生成完整报告，而不会创建工单、评论、附件或通知。可安全自定义的文件包括 config.json、.vscode/mcp.json、.github/glossary/terms.template.md、.github/instructions/learned.instructions.md，以及你自己创建的 .github/instructions/house-style.instructions.md。不要手动编辑核心 agent、随产品提供的 instruction 文件或 tools 文件夹；更新会覆盖它们，且不会备份。','BugIt 是许可使用，不是出售。Solo 同时允许 1 台设备。Team 最多允许 5 名成员，每人拥有各自的账户和设备。账户及其使用权不得共享、公开、转售、再许可或转让。您可以自定义配置、术语表、模板和自己的 instruction 文件，但不得绕过许可证、激活、席位限制或更新验证。BugIt 是一次性购买，不会自动续订：自首次激活起授予一年期许可证，到期后有 3 天宽限期。本协议受日本法律管辖。相关请求可向日本法院提起；如果您是消费者，这不影响您在居住国法院提起诉讼的权利。','Taskivator 只接收许可证/更新数据：在浏览器 Portal 中登录您的 BugIt 账户、一个单向哈希的设备 ID、一个随机安装标识符、您的设备名（主机名）与操作系统名称、BugIt 版本与您选择的 Solo 或 Team 套餐筛选、短时有效的加密质询材料，以及您为这台设备批准的 Solo 或 Team 权益。BugIt 软件不使用 Google Ads 衡量，也不发送产品遥测数据。（本网站本身为提升性能使用 Cloudflare Web Analytics。）报告、规格、术语表、house style、学习修正、本地文件和令牌都保留在您的设备上。报告文本只会发送到您选择并连接的 AI 模型和 tracker。']},
  ru: {homeIntro:'Документация обновлена для BugIt QA Agent: установка, активация, настройка и безопасное использование.',supportIntro:'При проблемах с настройкой сначала попросите ассистента BugIt диагностировать проблему, затем выполните Check status или Check readiness. Если помощь все еще нужна, создайте обращение в поддержку в личном кабинете BugIt.',before:'Перед созданием обращения в поддержку',beforeText:'Не включайте конфиденциальный исходный код, данные клиентов, приватные тикеты, скриншоты, токены или секреты. Опишите проблему BugIt в общих чертах.',sections:['Установите VS Code и GitHub Copilot, распакуйте BugIt, откройте папку, выберите BugIt QA Agent в Copilot Chat, активируйте лицензию, один раз примите условия и введите Begin setup. BugIt задаст простые вопросы, запишет config.json, поможет подключить трекер, а Check readiness подтвердит готовность.','Повседневная работа идет через чат: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings и Update. dry run создает полный отчет без тикетов, комментариев, вложений или уведомлений. Безопасно настраивать config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md и .github/instructions/house-style.instructions.md, если вы его создадите. Не редактируйте вручную основной agent, поставляемые instruction-файлы или папку tools; обновления их перезаписывают и они не входят в резервные копии.','BugIt лицензируется, а не продается. Solo разрешает 1 устройство одновременно. Team допускает до 5 участников, каждый со своей учётной записью и устройством. Учётной записью и связанным с ней правом использования нельзя делиться, их нельзя публиковать, перепродавать, сублицензировать или передавать другим лицам. Можно настраивать конфигурацию, глоссарий, шаблоны и собственные instruction-файлы, но нельзя обходить лицензию, активацию, ограничения мест или проверку обновлений. BugIt является разовой покупкой без автопродления: она предоставляет лицензию на один год с первой активации, с льготным периодом 3 дня после истечения. Настоящий договор регулируется законодательством Японии. Требования могут предъявляться в судах Японии; если вы потребитель, это не затрагивает ваше право обращаться в суды страны вашего проживания.','Taskivator получает только данные лицензии/обновлений: вход в вашу учётную запись BugIt (в браузере, на Portal), односторонний хешированный идентификатор устройства, случайный идентификатор установки, имя вашего устройства (hostname) и название операционной системы, версию BugIt и выбранный вами фильтр плана Solo или Team, недолговечный криптографический материал запроса-ответа, а также право Solo или Team, которое вы подтверждаете для этого устройства. Программное обеспечение BugIt не использует измерение Google Ads и не отправляет телеметрию продукта. (Сам этот сайт использует Cloudflare Web Analytics для оценки производительности.) Отчеты, спецификации, глоссарий, стиль, выученные исправления, локальные файлы и токены остаются на вашем устройстве. Текст отчета отправляется только выбранной вами AI-модели и подключенному трекеру.']}
};
Object.keys(bugitV16Faq).forEach(code=>{ if(i18n[code]) i18n[code].faq.items = bugitV16Faq[code]; });
Object.keys(bugitV16DocPages).forEach(code=>{ if(i18n[code]) i18n[code].docPages = merge(i18n[code].docPages, bugitV16DocPages[code]); });
/* Support-card subtitle (docs.supportDesc). Set explicitly per language after all
   merges so no language inherits another language's copy via the ja/en merge chain. */
const supportDescByLang={en:'Get help and open a support ticket.',de:'Hilfe erhalten und ein Support-Ticket öffnen.',es:'Obtén ayuda y abre un ticket de soporte.',fr:'Obtenez de l’aide et ouvrez un ticket de support.',it:'Ottieni aiuto e apri un ticket di supporto.',ja:'ヘルプを受け、サポートチケットを送信できます。',ko:'도움을 받고 지원 티켓을 등록하세요.','pt-br':'Receba ajuda e abra um chamado de suporte.',ru:'Получите помощь и создайте обращение в поддержку.',zh:'获取帮助并提交支持工单。'};
Object.keys(supportDescByLang).forEach(code=>{ if(i18n[code]&&i18n[code].docs) i18n[code].docs.supportDesc=supportDescByLang[code]; });
/* ko/zh inherit demo/integrations/trust from ja, and ru inherits demo/trust from en,
   via their base-language merge. Override those sections with proper translations. */
const sectionOverrides={"ko":{"demo":{"eyebrow":"실제 작동 보기","title":"하나의 에이전트, 다양한 QA 환경.","subtitle":"웹, 모바일, 데스크톱, SaaS, 엔터프라이즈 워크플로우, 게임까지 자유롭게 활용하세요.","saas":"SaaS / 웹 앱","game":"게임 QA","general":"일반 워크플로우"},"integrations":{"eyebrow":"사용하는 도구와 연동","title":"이미 쓰고 있는 도구를 연결하세요.","lede":"열한 개 추적 시스템 모두에 검증된 필드 매핑이 기본으로 내장되어 있으며, BugIt은 사용자가 자신의 계정에서 만든 자격 증명으로 그 전부에 등록합니다: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana, Trello. BugIt은 연결을 저장하기 전에 사용자의 자격 증명을 선택한 대상에 대해 확인합니다. 크래시 도구와 테스트 관리 등 다른 서비스는 사용자의 MCP 서버로 연결해 어시스턴트가 읽을 수 있습니다.","builtin":"검증된 매핑 기본 내장","mcp":"직접 운영하는 MCP 서버로","crash":"크래시 & 테스트","knowledge":"지식 & 협업","note":"⌁ 설정에서 지원되는 도구를 켜세요. 한 번만 연결하면 어디서나 사용할 수 있습니다. Amazon S3나 Google Drive 같은 스토리지 서비스는 자동으로 설정되지 않습니다."},"trust":{"privateTitle":"설계부터 프라이버시 중심","private":"작업 내용은 사용자가 연결한 AI와 트래커로만 전송되며, Taskivator로는 전송되지 않습니다. 데이터를 저장하거나 학습에 사용하거나 판매하지 않습니다.","telemetryTitle":"에이전트 텔레메트리 없음","telemetry":"BugIt 소프트웨어는 제품 텔레메트리를 전송하지 않습니다. 이 웹사이트는 성능을 위해 Cloudflare Web Analytics를 사용합니다.","previewTitle":"등록 전 미리 보기","preview":"모든 티켓을 검토하고 FILE IT을 입력해 승인해 등록합니다.","backupsTitle":"로컬 백업","backups":"설정과 활동 내역은 사용자의 기기에 저장됩니다. 언제든 손쉽게 백업할 수 있습니다.","updatesTitle":"안전한 업데이트","updates":"업데이트는 암호화 서명되며 설치 전에 검증됩니다.","vscodeTitle":"VS Code에서 실행","vscode":"VS Code에 최적화되어 별도의 앱을 설치할 필요가 없습니다. 이 외에 Copilot(또는 직접 준비한 AI 키)과 Python이 필요합니다."}},"zh":{"demo":{"eyebrow":"实战演示","title":"一个智能体，玩转各类 QA 场景。","subtitle":"适用于网页、移动端、桌面端、SaaS、企业级工作流乃至游戏。","core":"核心工作流","saas":"SaaS / 网页应用","game":"游戏 QA","mobile":"移动应用"},"integrations":{"eyebrow":"无缝对接你的工具","title":"连接你已在使用的工具。","lede":"全部十一个跟踪系统都内置经过测试的字段映射，BugIt 使用你在自己账户中创建的凭据向其中每一个提交：Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana 和 Trello。在保存连接之前，BugIt 会先验证你的凭据和目标位置。崩溃分析工具、测试管理等其他服务通过你自己的 MCP 服务器连接，供助手读取。","builtin":"内置已测试映射","mcp":"通过你的 MCP 服务器","crash":"崩溃与测试","knowledge":"知识与协作","note":"⌁ 在设置中启用受支持的工具。连接一次，处处可用。Amazon S3、Google Drive 等存储服务不会自动配置。"},"trust":{"privateTitle":"隐私优先设计","private":"你的工作内容仅发送到你连接的 AI 和跟踪系统，绝不发送给 Taskivator。我们绝不存储、训练或出售你的数据。","telemetryTitle":"无代理遥测","telemetry":"BugIt 软件不发送产品遥测数据。本网站为提升性能使用 Cloudflare Web Analytics。","previewTitle":"提交前先预览","preview":"每条工单都由你审核，输入 FILE IT 进行批准后提交。","backupsTitle":"本地备份","backups":"你的设置与操作记录都保存在本机。随时轻松备份。","updatesTitle":"安全更新","updates":"更新经过加密签名，安装前均会验证。","vscodeTitle":"在 VS Code 中运行","vscode":"原生集成于 VS Code，无需安装其他应用。此外还需要 Copilot（或你自己的 AI 密钥）和 Python。"}},"ru":{"demo":{"eyebrow":"СМОТРИТЕ В ДЕЙСТВИИ","title":"Один агент. Разные миры QA.","subtitle":"Используйте его для веба, мобильных и десктопных приложений, SaaS, корпоративных рабочих процессов или игр.","core":"Основной сценарий","saas":"SaaS / веб-приложение","game":"QA для игр","mobile":"Мобильное приложение"},"trust":{"privateTitle":"Приватность по умолчанию","private":"Ваша работа отправляется только в подключённые вами ИИ и трекер, но никогда в Taskivator. Мы никогда не храним ваши данные, не обучаем на них модели и не продаём их.","telemetryTitle":"Без телеметрии агента","telemetry":"Программное обеспечение BugIt не отправляет телеметрию продукта. Этот сайт использует Cloudflare Web Analytics для оценки производительности.","previewTitle":"Предпросмотр перед отправкой","preview":"Вы просматриваете каждый тикет и подтверждаете каждую отправку вводом FILE IT.","backupsTitle":"Локальные резервные копии","backups":"Ваши настройки и активность остаются на вашем компьютере. Удобное резервное копирование в любой момент.","updatesTitle":"Безопасные обновления","updates":"Обновления криптографически подписаны и проверяются перед установкой.","vscodeTitle":"Работает в VS Code","vscode":"Изначально создан для VS Code, поэтому отдельное приложение устанавливать не нужно. Также понадобятся Copilot (или ваш собственный ключ ИИ) и Python."}}};
Object.keys(sectionOverrides).forEach(code=>{ if(i18n[code]) i18n[code]=merge(i18n[code],sectionOverrides[code]); });

/* === localized i18n overrides (generated) === */
add("ja", {"name":"日本語","nav":{"features":"機能","integrations":"連携","pricing":"価格","docs":"ドキュメント","faq":"FAQ"},"cta":{"early":"BugItを入手","demo":"デモを見る","signin":"サインイン"},"hero":{"title":"ワークフローを<span>学習する</span>QAエージェント。","subtitle":"ラフなテストメモを、確認済みのきれいなバグチケットに変換し、数秒で Jira、Azure DevOps、またはお使いのトラッカーへ送ります。"},"metrics":{"saved":"で登録","dupe":"重複チェック","setup":"セットアップ","private":"プライベート設計","savedNum":"数秒","dupeNum":"自動","setupNum":"ガイド付き","privateNum":"プライベート"},"under":{"features":"✓ 全機能込み","updates":"✓ ソフトウェア更新無料","private":"✓ プライベート設計"},"demo":{"eyebrow":"動作を見る","title":"1つのエージェント。さまざまなQA現場。","subtitle":"Web、モバイル、デスクトップ、SaaS、エンタープライズ、ゲームに対応。","core":"基本ワークフロー","saas":"SaaS / Webアプリ","game":"ゲームQA","mobile":"モバイルアプリ"},"integrations":{"eyebrow":"ツール連携","title":"今使っているツールにつながります。","lede":"11 のトラッカーすべてに組み込みの検証済みフィールドマッピングがあり、BugIt はお客様ご自身のアカウントで作成した資格情報でそのすべてに登録します: Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana、Trello。接続を保存する前に、BugIt がお客様ご自身の資格情報を選択した宛先に対して検証します。クラッシュ解析ツール、テスト管理などのサービスは、ご自身の MCP サーバー経由で接続し、アシスタントが読み取れます。","builtin":"組み込み検証済みマッピング","mcp":"MCPサーバー経由","crash":"クラッシュとテスト","knowledge":"ナレッジとコラボ","note":"⌁ セットアップで対応ツールを有効化。1回接続すれば、どこでも使えます。Amazon S3 や Google Drive などのストレージは自動では設定されません。"},"pricing":{"soloTitle":"ソロライセンス","teamTitle":"チームライセンス","seats":"","perYear":" 買い切り","soloTerm":"1年間のSoloライセンス・自動更新なし","teamTerm":"1年間のTeamライセンス・自動更新なし","limited":"導入価格","soloRegular":"通常価格 $59.99","teamRegular":"通常価格 $249.99","soloDevice":"1デバイス（1ユーザー）","allFeatures":"全機能込み","updates":"有効期間中はソフトウェア更新無料","docs":"ドキュメントとガイド","support":"メールサポート","teamDevices":"最大5名、各メンバーが自分のアカウントを持つ","teamWorkflow":"共有QAワークフロー","teamConfig":"共有プロジェクト設定","teamSeverity":"一貫した重要度とカテゴリ","teamTools":"チーム設定ツール","priority":"優先サポート","teamCta":"BugIt Team を購入","soloCta":"BugIt Solo を購入"},"trust":{"privateTitle":"プライベート設計","private":"作業内容は、あなたが接続したAIとトラッカーにのみ送られ、Taskivator に送られることはありません。保存、学習利用、販売はしません。","telemetryTitle":"エージェントのテレメトリなし","telemetry":"BugIt ソフトウェアは製品テレメトリを送信しません。本ウェブサイトはパフォーマンスのために Cloudflare Web Analytics を使用します。","previewTitle":"登録前にプレビュー","preview":"すべてのチケットを確認し、FILE IT と入力して承認し、登録します。","backupsTitle":"ローカルバックアップ","backups":"設定と作業履歴はマシン上に残り、いつでもバックアップできます。","updatesTitle":"安全な更新","updates":"更新は暗号署名され、インストール前に検証されます。","vscodeTitle":"お使いの環境で動作","vscode":"別のアプリのインストールは不要です。起票はコマンドなので、VS Code の Copilot Chat でも Claude 拡張機能でも、通常のターミナルでも同じように動作します。このほかに AI アシスタントと Python が必要です。"},"faq":{"title":"購入前の疑問をクリアに。","items":[["BugItは自動で登録しますか？","いいえ。すべてのチケット、コメント、添付、通知はまずプレビューされます。取り消せない起票の前には、FILE IT と入力して承認します。チャットの文章だけでは登録されません。単なる「はい」では実行されません。ゼロ書き込みで練習するには dry run を使ってください。"],["組み込みの検証済みマッピングがあるトラッカーは？","11 のトラッカーすべてが検証済みフィールドマッピングに対応し、お客様ご自身のアカウントで作成した資格情報を使って各トラッカーの REST API へ直接登録します（登録に MCP は使いません）: Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana、Trello。クラッシュ解析ツールやテスト管理などのサービスは、引き続きご自身の MCP サーバー経由で接続します。"],["GitHub Copilotは必要ですか？","最も簡単なセットアップなので推奨です。VS Code の Claude 拡張機能、他のアシスタント、普通のターミナルでも動作します。登録はコマンドなので、どこでも同じように使えます。"],["Claude、Gemini、GPTは使えますか？","はい。GitHub Copilot 内でプランに含まれるモデルを使えます。スタンドアロンでは OpenAI または Anthropic キーに対応します。"],["Taskivatorは私の作業を見ますか？","いいえ。バグレポート、仕様、用語集、スクリーンショット、コード、設定、チケットは Taskivator に送信されません。使用されるのはライセンス/更新データのみです。"],["送信されるライセンス/更新データは？","ブラウザーの Portal で行う BugIt アカウントへのサインイン、一方向にハッシュ化された匿名のデバイス ID、ランダムなインストール ID、デバイス名（ホスト名）と OS 名、BugIt のバージョン、選択した Solo または Team のプラン、短時間だけ有効な暗号学的チャレンジ情報、そしてこのデバイスに対して承認した Solo または Team のライセンス情報です。"],["Teamには何が含まれますか？","BugIt Team は現在ご利用いただけます。買い切りで、最大5名向けの1年間ライセンスです。共有ライセンスではなく、各メンバーが自分専用の BugIt アカウント、自分専用のサインイン、自分専用のデバイスアクティベーションを持ちます。チーム設定は共有され、ポータルで一元管理され、自動更新はありません。Solo プランは影響を受けず、同様にご利用いただけます。"],["登録せずに練習できますか？","はい。dry run を使うと、チケット、コメント、添付、通知を作成せずに完全なレポートを生成できます。 dry run はBugItに付属するヘルパーの書き込みを止め、エージェントにトラッカーへの書き込みを拒否するよう指示します。この拒否はプラットフォーム側のロックではなくBugItの指示に従うものなので、検証時は読み取り専用の認証情報を使ってください。"],["安全に編集できるファイルは？","config.json、.vscode/mcp.json、.github/glossary/terms.template.md、.github/instructions/learned.instructions.md、作成した場合の .github/instructions/house-style.instructions.md です。"],["手動編集してはいけないものは？",".github/agents/bugit-qa-agent.agent.md、出荷済みの .github/instructions/ 内の他ファイル、tools/ 内のファイルは編集しないでください。更新で上書きされ、バックアップされません。"],["更新はどう動きますか？","BugItはユーザー所有の設定をバックアップし、署名済み更新を検証し、設定、用語集、ハウススタイル、ライセンス、接続を保持したまま更新します。"],["ライセンスが切れるとどうなりますか？","ライセンス期間が終了すると3日間の猚予期間があり、その後は起票とアクティベーションに有効なライセンスが必要になります。ローカルのファイルと設定はそのまま残ります。ライセンスサーバー障害時は別で、キャッシュ確認により最大72時間オフラインで作業できます。"],["更新ライセンスは積み上がりますか？","いいえ。更新すると現在の有効化を置き換え、その日から新しい期間が始まります。現在の期間の終わり近くで更新してください。"],["サポートはどう受けますか？","まずAIアシスタントに診断を依頼し、Check status または Check readiness を実行してください。それでも解決しない場合は、BugItダッシュボードからサポートチケットを送信してください。機密情報を含める必要はありません。"]]},"docs":{"eyebrow":"ドキュメント","getting":"はじめに","gettingDesc":"数分でセットアップ。","user":"ユーザーガイド","userDesc":"機能とワークフローの完全ガイド。","license":"ライセンス契約","licenseDesc":"BugItの利用条件。","privacy":"プライバシーポリシー","privacyDesc":"データの収集、利用、保護について。","faqDesc":"よくある質問への回答。","support":"サポート","supportDesc":"ヘルプを受け、サポートチケットを送信できます。","commerce":"特定商取引法に基づく表記","commerceDesc":"販売事業者・取引に関する表記。","refund":"返金ポリシー","refundDesc":"7日間の返金ポリシーについて。"},"docPages":{"homeTitle":"ドキュメント","homeIntro":"BugIt QA Agent に合わせた、インストール、認証、カスタマイズ、安全な利用のためのドキュメントです。","gettingTitle":"はじめに","userTitle":"ユーザーガイド","licenseTitle":"ライセンス契約","privacyTitle":"プライバシーポリシー","faqTitle":"FAQ","supportTitle":"サポート","supportIntro":"セットアップで困ったら、まずBugItアシスタントに診断を依頼し、Check status または Check readiness を実行してください。それでも解決しない場合は、BugItダッシュボードからサポートチケットを送信してください。","download":"PDFをダウンロード","before":"サポートチケットを送信する前に","beforeText":"機密コード、顧客データ、非公開チケット、スクリーンショット、トークン、秘密情報は含めないでください。BugItの問題を一般的な内容で説明してください。","sections":["VS Code と GitHub Copilot をインストールし、BugItを展開してフォルダを開き、Copilot ChatでBugIt QA Agentを選び、ライセンスを有効化し、初回のみ利用条件に同意してから Begin setup と入力します。BugItが質問し、config.jsonを作成し、トラッカーへの接続を案内し、Check readinessで準備完了を確認します。","普段はチャットで使います: Write a bug report、Quick bug、Write a crash bug report、Translate、Close #ID、Check status、Check readiness、Back up my settings、Restore my settings、Update。書き込みなしで練習するには dry run を使います。安全にカスタマイズできるのは config.json、.vscode/mcp.json、.github/glossary/terms.template.md、.github/instructions/learned.instructions.md、作成した場合の .github/instructions/house-style.instructions.md です。コアエージェント、出荷済みinstruction、toolsフォルダは手動編集しないでください。更新で上書きされ、バックアップされません。","BugItは販売ではなくライセンス提供です。Soloは同時に1デバイス、Teamは最大5メンバーで、各メンバーが自分のアカウントとデバイスを持ちます。アカウントおよびその利用権（エンタイトルメント）の共有、公開、再販売、サブライセンス、譲渡は禁止です。設定、用語集、テンプレート、自分のinstructionファイルはカスタマイズできますが、ライセンス、認証、シート制限、更新検証の回避は禁止です。BugItは自動更新のない一回限りの買い切り購入です。購入により、初回有効化から始まる1年間のライセンスが付与され、期限後は3日間の猶予期間があります。本契約には日本法が適用されます。請求は日本の裁判所に提起することができます。お客様が消費者である場合、これは居住国の裁判所で手続を行う権利に影響しません。","Taskivatorへ送信されるのはライセンス/更新データのみです: ブラウザーの Portal での BugIt アカウントへのサインイン、一方向でハッシュ化されたデバイス ID、ランダムなインストール識別子、デバイス名（ホスト名）と OS 名、BugIt のバージョンと選択した Solo／Team のプランフィルター、短時間だけ有効な暗号チャレンジ、そしてこのデバイスに対して承認する Solo または Team の権利。BugIt ソフトウェアは、Google Ads の計測を使用せず、製品テレメトリも送信しません。（本ウェブサイト自体はパフォーマンスのために Cloudflare Web Analytics を使用します。）レポート、仕様、用語集、ハウススタイル、学習内容、ローカルファイル、トークンは端末上に残ります。レポート本文は、あなたが選んで接続したAIモデルとトラッカーにのみ送られます。"],"commerceTitle":"特定商取引法に基づく表記","commerceIntro":"特定商取引法（通信販売）に基づく、BugIt の販売事業者および取引に関する表記です。","refundTitle":"返金ポリシー","refundIntro":"BugIt ライセンスのご購入に関する返金ポリシーです。"}});
add("es", {"name":"Español","nav":{"features":"Funciones","integrations":"Integraciones","pricing":"Precios","docs":"Documentación","faq":"FAQ"},"cta":{"early":"Obtener BugIt","demo":"Ver demo","signin":"Iniciar sesión"},"hero":{"title":"El agente QA que <span>aprende</span> su flujo de trabajo.","subtitle":"Convierte notas de prueba en tickets limpios y revisados, enviados a Jira, Azure DevOps o tu propio tracker en segundos."},"metrics":{"saved":"para registrar","dupe":"búsqueda de duplicados","setup":"configuración","private":"privado por diseño","savedNum":"Segundos","dupeNum":"Automático","setupNum":"Guiada","privateNum":"Privado"},"under":{"features":"✓ Todas las funciones incluidas","updates":"✓ Actualizaciones de software gratis","private":"✓ Privado por diseño"},"demo":{"eyebrow":"VERLO EN ACCIÓN","title":"Un agente. Distintos mundos de QA.","subtitle":"Úselo para web, móvil, escritorio, SaaS, flujos empresariales o juegos.","core":"Flujo principal","saas":"SaaS / App web","game":"QA de juegos","mobile":"App móvil"},"integrations":{"eyebrow":"FUNCIONA CON SUS HERRAMIENTAS","title":"Conecte las herramientas que ya usa.","lede":"Los once sistemas de seguimiento incluyen un mapeo de campos integrado y probado. BugIt crea tickets en todos ellos con una credencial que usted genera en su propia cuenta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana y Trello. BugIt valida la credencial y el destino antes de guardar la conexión. Las herramientas de fallos, la gestión de pruebas y otros servicios se conectan mediante su propio servidor MCP para que el asistente pueda consultarlos.","builtin":"MAPEO INTEGRADO Y PROBADO","mcp":"MEDIANTE SU SERVIDOR MCP","crash":"CRASH Y PRUEBAS","knowledge":"CONOCIMIENTO Y COLABORACIÓN","note":"⌁ Activa una herramienta compatible en la configuración. Conecta una vez y úsala en todas partes. Servicios de almacenamiento como Amazon S3 y Google Drive no se configuran automáticamente."},"pricing":{"soloTitle":"LICENCIA INDIVIDUAL","teamTitle":"LICENCIA DE EQUIPO","seats":"","perYear":" pago único","soloTerm":"Licencia Solo de 1 año · no se renueva automáticamente","teamTerm":"Licencia Team de 1 año · no se renueva automáticamente","limited":"Precio de lanzamiento","soloRegular":"Precio normal $59.99","teamRegular":"Precio normal $249.99","soloDevice":"1 dispositivo (1 usuario)","allFeatures":"Todas las funciones incluidas","updates":"Actualizaciones de software gratis mientras esté activa","docs":"Documentación y guías","support":"Soporte por correo electrónico","teamDevices":"Hasta 5 miembros, cada uno con su propia cuenta","teamWorkflow":"Flujo QA compartido","teamConfig":"Configuración de proyecto compartida","teamSeverity":"Severidades y categorías consistentes","teamTools":"Herramientas de configuración de equipo","priority":"Soporte prioritario","teamCta":"Obtener BugIt Team","soloCta":"Obtener BugIt Solo"},"trust":{"privateTitle":"Privado por diseño","private":"Su trabajo va únicamente a la IA y al rastreador que conecte, nunca a Taskivator. No lo almacenamos, entrenamos ni vendemos.","telemetryTitle":"Sin telemetría del agente","telemetry":"El software BugIt no envía telemetría del producto. Este sitio web usa Cloudflare Web Analytics para el rendimiento.","previewTitle":"Vista previa antes de enviar","preview":"Revisa cada ticket y aprueba cada envío escribiendo FILE IT.","backupsTitle":"Copias locales","backups":"Sus ajustes y actividad permanecen en su equipo. Copias fáciles cuando quiera.","updatesTitle":"Actualizaciones seguras","updates":"Las actualizaciones están firmadas criptográficamente y se verifican antes de instalarse.","vscodeTitle":"Funciona donde ya trabaja","vscode":"No hay otra app que instalar. Registrar es un comando, así que funciona igual en VS Code con Copilot Chat o la extensión de Claude, y en una terminal normal. También necesita un asistente de IA y Python."},"faq":{"title":"Detalles de lanzamiento, sin sorpresas.","items":[["¿BugIt registra errores automáticamente?","No. Cada ticket, comentario, adjunto o notificación se muestra primero como vista previa. Antes de registrar un ticket irreversible, lo apruebas escribiendo FILE IT; el texto del chat por sí solo nunca registra nada. Un simple «sí» no basta. Use dry run para practicar sin ninguna escritura."],["¿Qué trackers tienen mapeo integrado y probado?","Los once sistemas de seguimiento incluyen mapeo de campos integrado y probado, y BugIt archiva en todos ellos con una credencial que creas en tu propia cuenta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana y Trello. BugIt valida tu propia credencial y destino antes de guardar la conexión. Las herramientas de fallos, la gestión de pruebas y otros servicios se conectan mediante tu propio servidor MCP para que tu asistente pueda leerlos."],["¿Necesito GitHub Copilot?","GitHub Copilot es la configuración más sencilla y recomendada. BugIt también funciona con la extensión de Claude en VS Code, con otro asistente o en una terminal: registrar es un comando, así que funciona igual en todos."],["¿Puedo usar Claude, Gemini o GPT?","Sí, dentro de GitHub Copilot cuando esos modelos estén disponibles en su plan. El modo standalone admite su propia clave de OpenAI o Anthropic."],["¿Taskivator ve mi trabajo?","No. Los reportes de errores, especificaciones, glosario, capturas, código, configuración y tickets no se envían a Taskivator. Solo se usa información de licencia y actualización."],["¿Qué datos de licencia/actualización se envían?","El inicio de sesión en su cuenta de BugIt (en el navegador, en el Portal), un identificador de dispositivo con hash unidireccional, un identificador de instalación aleatorio, el nombre de su equipo (hostname) y el del sistema operativo, la versión de BugIt y el filtro de plan Solo o Team que elija, material criptográfico de desafío de corta duración y la titularidad Solo o Team que aprueba para este dispositivo."],["¿Qué incluye Team?","El plan Team ya está disponible. Un pago único cubre una licencia de 1 año para hasta 5 miembros: cada miembro tiene su propia cuenta de BugIt, su propio inicio de sesión y su propia activación de dispositivo, en lugar de una licencia compartida. La configuración del equipo se comparte y se gestiona de forma centralizada en el Portal, y no se renueva automáticamente. El plan Solo no se ve afectado y también está disponible."],["¿Puedo practicar sin registrar nada?","Sí. Use dry run para generar el reporte completo sin crear tickets, comentarios, adjuntos ni notificaciones. Dry run impide que los helpers integrados de BugIt escriban y ordena al agente rechazar escrituras en el tracker; esa negativa sigue las instrucciones de BugIt en lugar de un bloqueo de plataforma, así que use credenciales de solo lectura al evaluar."],["¿Qué archivos puedo editar con seguridad?","Puede editar config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md y .github/instructions/house-style.instructions.md si lo crea."],["¿Qué no debo editar manualmente?","No edite .github/agents/bugit-qa-agent.agent.md, otros archivos incluidos bajo .github/instructions/ ni nada dentro de tools/. Las actualizaciones sobrescriben esos archivos de producto y no se respaldan."],["¿Cómo funcionan las actualizaciones?","BugIt respalda sus archivos propios de configuración, verifica actualizaciones firmadas, instala en el mismo lugar y conserva config, glosario, estilo, licencia y conexiones."],["¿Qué pasa cuando expira mi licencia?","Hay un periodo de gracia de 3 días tras terminar la licencia anual. Si falla el servidor de licencias, una verificación en caché permite seguir trabajando hasta 72 horas sin conexión."],["¿Las renovaciones se acumulan?","No. Una renovación reemplaza tu activación actual y empieza un nuevo periodo desde esa fecha. Renueve cerca del final del periodo actual."],["¿Cómo recibo soporte?","Primero pida al asistente de IA que diagnostique el problema y ejecute Check status o Check readiness. Si sigue atascado, abra un ticket de soporte desde su panel de BugIt: no necesita incluir detalles confidenciales del proyecto."]]},"docs":{"eyebrow":"DOCUMENTACIÓN","getting":"Primeros pasos","gettingDesc":"Configure BugIt en minutos.","user":"Guía de usuario","userDesc":"Guía completa de funciones y flujos.","license":"Acuerdo de licencia","licenseDesc":"Términos de uso de BugIt.","privacy":"Política de privacidad","privacyDesc":"Cómo recopilamos, usamos y protegemos sus datos.","faqDesc":"Respuestas a preguntas comunes.","support":"Soporte","supportDesc":"Obtenga ayuda y abra un ticket de soporte.","commerce":"Transacciones Comerciales","commerceDesc":"Datos del vendedor y de la transacción (特定商取引法に基づく表記).","refund":"Política de reembolso","refundDesc":"Nuestra política de reembolso de 7 días."},"docPages":{"homeTitle":"Documentación","homeIntro":"Documentación actualizada para BugIt QA Agent: instalación, activación, personalización y uso seguro.","gettingTitle":"Primeros pasos","userTitle":"Guía de usuario","licenseTitle":"Acuerdo de licencia","privacyTitle":"Política de privacidad","faqTitle":"FAQ","supportTitle":"Soporte","supportIntro":"Si tiene problemas de configuración, primero pida al asistente de BugIt que diagnostique el problema y ejecute Check status o Check readiness. Si aún necesita ayuda, abra un ticket de soporte desde su panel de BugIt.","download":"Descargar PDF","before":"Antes de abrir un ticket de soporte","beforeText":"No incluya código fuente confidencial, datos de clientes, tickets privados, capturas, tokens ni secretos. Describa el problema de BugIt en términos generales.","sections":["Instale VS Code y GitHub Copilot, descomprima BugIt, abra la carpeta, elija BugIt QA Agent en Copilot Chat, active su licencia, acepte los términos una vez y escriba Begin setup. BugIt hace preguntas sencillas, escribe config.json, le ayuda a conectar su sistema de seguimiento y Check readiness confirma que todo está listo.","El uso diario es por chat: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings y Update. Use dry run para generar un reporte completo sin crear tickets, comentarios, adjuntos ni notificaciones. La personalización segura vive en config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md y .github/instructions/house-style.instructions.md si lo crea. No edite a mano el agente principal, los archivos de instrucciones incluidos ni la carpeta tools; las actualizaciones los sobrescriben y no se respaldan.","BugIt se licencia, no se vende. Solo permite 1 dispositivo a la vez. Team permite hasta 5 miembros, cada uno con su propia cuenta y dispositivo. Tu cuenta y su derecho de uso no se pueden compartir, publicar, revender, sublicenciar ni transferir. Puede personalizar configuración, glosario, plantillas y sus propios archivos de instrucciones, pero no puede saltarse licencia, activación, límites de puestos ni verificación de actualizaciones. BugIt es una compra única que no se renueva automáticamente: concede una licencia de un año desde la primera activación, con un periodo de gracia de 3 días tras expirar. Este contrato se rige por las leyes de Japón. Las reclamaciones podrán presentarse ante los tribunales de Japón; si usted es consumidor, ello no afecta a su derecho a acudir a los tribunales de su país de residencia.","Taskivator solo recibe datos de licencia/actualización: el inicio de sesión en su cuenta de BugIt (en el navegador, en el Portal), un identificador de dispositivo con hash unidireccional, un identificador de instalación aleatorio, el nombre de su equipo (hostname) y el del sistema operativo, la versión de BugIt y el filtro de plan Solo o Team que elija, material criptográfico de desafío de corta duración y la titularidad Solo o Team que aprueba para este dispositivo. El software BugIt no utiliza la medición de Google Ads ni envía telemetría del producto. (Este sitio web usa Cloudflare Web Analytics para el rendimiento.) Tus reportes, specs, glosario, estilo, correcciones aprendidas, archivos locales y tokens permanecen en tu dispositivo. El texto del reporte solo va al modelo de IA y al tracker que eliges y conectas."],"commerceTitle":"Transacciones Comerciales","commerceIntro":"Información sobre el vendedor y la transacción de BugIt, incluida la información prevista para las ventas a distancia en Japón conforme a la Ley de Transacciones Comerciales Especificadas (特定商取引法).","refundTitle":"Política de reembolso","refundIntro":"Nuestra política de reembolso para la compra de licencias de BugIt."}});
add("fr", {"name":"Français","nav":{"features":"Fonctionnalités","integrations":"Intégrations","pricing":"Tarifs","docs":"Documentation","faq":"FAQ"},"cta":{"early":"Obtenir BugIt","demo":"Voir la démo","signin":"Se connecter"},"hero":{"title":"L’agent QA qui <span>apprend</span> votre workflow.","subtitle":"Transformez vos notes de test en tickets propres et relus, envoyés à Jira, Azure DevOps ou votre propre outil de suivi en quelques secondes."},"metrics":{"saved":"pour créer","dupe":"détection de doublons","setup":"configuration","private":"par conception","savedNum":"Secondes","dupeNum":"Automatique","setupNum":"Guidée","privateNum":"Privé"},"under":{"features":"✓ Toutes les fonctionnalités incluses","updates":"✓ Mises à jour logicielles gratuites","private":"✓ Privé par conception"},"demo":{"eyebrow":"VOIR EN ACTION","title":"Un agent. Plusieurs mondes QA.","subtitle":"Pour le web, mobile, desktop, SaaS, entreprise ou jeux.","core":"Workflow principal","saas":"SaaS / Appli web","game":"QA jeu","mobile":"Appli mobile"},"integrations":{"eyebrow":"FONCTIONNE AVEC VOS OUTILS","title":"Connectez les outils que vous utilisez déjà.","lede":"Les onze outils de suivi disposent d'un mappage de champs intégré et testé. BugIt y crée les tickets directement par l'API REST de chaque outil, avec un identifiant généré dans votre compte : Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana et Trello. La création de tickets n'utilise pas MCP. Les outils de plantage, la gestion des tests et les autres services utilisent toujours votre propre serveur MCP.","builtin":"MAPPAGE INTÉGRÉ TESTÉ","mcp":"VIA VOTRE SERVEUR MCP","crash":"CRASH & TEST","knowledge":"CONNAISSANCE & COLLAB","note":"⌁ Activez un outil pris en charge pendant la configuration. Connectez une fois, utilisez partout. Les services de stockage comme Amazon S3 et Google Drive ne sont pas configurés automatiquement."},"pricing":{"soloTitle":"LICENCE SOLO","teamTitle":"LICENCE ÉQUIPE","seats":"","perYear":" paiement unique","soloTerm":"Licence Solo de 1 an · sans reconduction automatique","teamTerm":"Licence Équipe de 1 an · sans reconduction automatique","limited":"Prix de lancement","soloRegular":"Prix normal 59,99 $","teamRegular":"Prix normal 249,99 $","soloDevice":"1 appareil (1 utilisateur)","allFeatures":"Toutes les fonctionnalités incluses","updates":"Mises à jour logicielles gratuites tant que la licence est active","docs":"Documentation et guides","support":"Support par e-mail","teamDevices":"Jusqu'à 5 membres, chacun avec son propre compte","teamWorkflow":"Workflow QA partagé","teamConfig":"Configuration de projet partagée","teamSeverity":"Sévérités et catégories cohérentes","teamTools":"Outils de configuration d’équipe","priority":"Support prioritaire","teamCta":"Obtenir BugIt Team","soloCta":"Obtenir BugIt Solo"},"trust":{"privateTitle":"Privé par conception","private":"Votre travail va uniquement à l’IA et au traqueur que vous connectez, jamais à Taskivator. Nous ne stockons, n’entraînons ni ne vendons jamais vos données.","telemetryTitle":"Aucune télémétrie de l’agent","telemetry":"Le logiciel BugIt n’envoie aucune télémétrie produit. Ce site web utilise Cloudflare Web Analytics pour les performances.","previewTitle":"Aperçu avant création","preview":"Vous relisez chaque ticket et approuvez chaque création en tapant FILE IT.","backupsTitle":"Sauvegardes locales","backups":"Vos paramètres et votre activité restent sur votre machine. Sauvegardes faciles à tout moment.","updatesTitle":"Mises à jour sécurisées","updates":"Les mises à jour sont signées cryptographiquement et vérifiées avant l’installation.","vscodeTitle":"Fonctionne là où vous travaillez déjà","vscode":"Intégré nativement à VS Code, BugIt ne nécessite aucune application distincte. La création est une commande : cela fonctionne de la même façon dans VS Code avec Copilot Chat ou l’extension Claude, et dans un terminal classique. Vous aurez également besoin de GitHub Copilot (ou de votre propre clé API d’IA) et de Python."},"faq":{"title":"Les détails du lancement, sans surprise.","items":[["BugIt crée-t-il des tickets automatiquement ?","Non. Chaque ticket, commentaire, pièce jointe ou notification est d’abord prévisualisé. Avant de créer un ticket irréversible, vous l’approuvez en tapant FILE IT ; le texte du chat seul ne crée jamais rien. Un simple « oui » ne suffit pas. Utilisez dry run pour vous entraîner sans aucune écriture."],["Quels outils de suivi ont un mappage intégré et testé ?","Les onze outils de suivi disposent d'un mappage de champs intégré et testé. BugIt y crée les tickets directement par l'API REST de chaque outil, avec un identifiant généré dans votre compte : Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana et Trello. La création de tickets n'utilise pas MCP. Les outils de plantage, la gestion des tests et les autres services utilisent toujours votre propre serveur MCP."],["Ai-je besoin de GitHub Copilot ?","GitHub Copilot est recommandé et offre l’installation la plus simple. BugIt fonctionne aussi avec l’extension Claude dans VS Code, un autre assistant ou un simple terminal : la création est une commande, elle fonctionne donc de la même façon partout."],["Puis-je utiliser Claude, Gemini ou GPT ?","Oui, dans GitHub Copilot lorsque ces modèles sont disponibles dans votre abonnement. Le mode autonome prend en charge votre propre clé OpenAI ou Anthropic."],["Taskivator voit-il mon travail ?","Non. Les rapports, spécifications, glossaire, captures, code, réglages et tickets ne sont pas envoyés à Taskivator. Seules les données de licence/mise à jour sont utilisées."],["Quelles données de licence/mise à jour sont envoyées ?","La connexion à votre compte BugIt (dans le navigateur, sur le Portal), un identifiant d’appareil haché à sens unique, un identifiant d’installation aléatoire, le nom de votre machine (hostname) et celui du système d’exploitation, la version de BugIt et le filtre d’offre Solo ou Team que vous choisissez, un matériel cryptographique de défi à durée de vie courte, et le droit Solo ou Team que vous approuvez pour cet appareil."],["Que comprend la licence Équipe ?","L'offre Team est disponible dès maintenant. Un paiement unique couvre une licence de 1 an pour jusqu'à 5 membres, et chaque membre dispose de son propre compte BugIt, de sa propre connexion et de sa propre activation d'appareil, au lieu d'une licence partagée. La configuration de l'équipe est partagée et gérée de façon centralisée dans le Portail, sans reconduction automatique. L'offre Solo n'est pas affectée et reste disponible."],["Puis-je m’entraîner sans créer de ticket ?","Oui. Utilisez dry run pour générer le rapport complet sans créer de tickets, commentaires, pièces jointes ni notifications. Le dry run empêche les utilitaires intégrés de BugIt d’écrire et demande à l’agent de refuser les écritures dans le tracker ; ce refus suit les instructions de BugIt et non un verrou de la plateforme, utilisez donc des identifiants en lecture seule pour vos essais."],["Quels fichiers puis-je modifier sans risque ?","Vous pouvez modifier config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md et .github/instructions/house-style.instructions.md si vous le créez."],["Que ne dois-je pas modifier à la main ?","Ne modifiez pas .github/agents/bugit-qa-agent.agent.md, les autres fichiers livrés sous .github/instructions/ ni les fichiers dans tools/. Les mises à jour écrasent ces fichiers produit et ils ne sont pas sauvegardés."],["Comment fonctionnent les mises à jour ?","BugIt sauvegarde vos fichiers de configuration, vérifie les mises à jour signées, installe sur place et conserve config, glossaire, style maison, licence et connexions."],["Que se passe-t-il à l’expiration de ma licence ?","Une période de grâce de 3 jours suit la fin de la licence annuelle. En cas de panne du serveur de licence, une vérification en cache vous laisse travailler jusqu’à 72 heures hors ligne."],["Les renouvellements se cumulent-ils ?","Non. Un renouvellement remplace votre activation actuelle et démarre une nouvelle période à cette date. Renouvelez près de la fin de la période en cours."],["Comment obtenir de l’aide ?","Demandez d’abord à l’assistant IA de diagnostiquer le problème, puis lancez Check status ou Check readiness. Si vous êtes toujours bloqué, ouvrez un ticket de support depuis votre tableau de bord BugIt. Il est inutile d’inclure des détails confidentiels du projet."]]},"docs":{"eyebrow":"DOCUMENTATION","getting":"Premiers pas","gettingDesc":"Configurez BugIt en quelques minutes.","user":"Guide d’utilisation","userDesc":"Guide complet des fonctionnalités et des workflows.","license":"Contrat de licence","licenseDesc":"Conditions d’utilisation de BugIt.","privacy":"Politique de confidentialité","privacyDesc":"Comment nous collectons, utilisons et protégeons vos données.","faqDesc":"Réponses aux questions fréquentes.","support":"Assistance","supportDesc":"Obtenez de l’aide et ouvrez un ticket de support.","commerce":"Transactions Commerciales","commerceDesc":"Informations sur le vendeur et la transaction (特定商取引法に基づく表記).","refund":"Politique de remboursement","refundDesc":"Notre politique de remboursement de 7 jours."},"docPages":{"homeTitle":"Documentation","homeIntro":"Documentation mise à jour pour BugIt QA Agent : installation, activation, personnalisation et utilisation sûre.","gettingTitle":"Premiers pas","userTitle":"Guide d’utilisation","licenseTitle":"Contrat de licence","privacyTitle":"Politique de confidentialité","faqTitle":"FAQ","supportTitle":"Assistance","supportIntro":"En cas de problème de configuration, demandez d’abord à l’assistant BugIt de diagnostiquer le problème, puis lancez Check status ou Check readiness. Si vous avez encore besoin d’aide, ouvrez un ticket de support depuis votre tableau de bord BugIt.","download":"Télécharger le PDF","before":"Avant d’ouvrir un ticket de support","beforeText":"N’incluez pas de code source confidentiel, données client, tickets privés, captures, jetons ou secrets. Décrivez le problème BugIt en termes généraux.","sections":["Installez VS Code et GitHub Copilot, décompressez BugIt, ouvrez le dossier, choisissez BugIt QA Agent dans Copilot Chat, activez votre licence, acceptez les conditions une fois, puis tapez Begin setup. BugIt pose des questions simples, écrit config.json pour vous, aide à connecter votre outil de suivi, et Check readiness confirme que tout est prêt.","L’usage quotidien se fait dans le chat : Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings et Update. Utilisez dry run pour obtenir un rapport complet sans créer de tickets, commentaires, pièces jointes ni notifications. Les personnalisations sûres sont config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md et .github/instructions/house-style.instructions.md si vous le créez. Ne modifiez pas à la main l’agent central, les instructions livrées ou le dossier tools ; les mises à jour les écrasent et ils ne sont pas sauvegardés.","BugIt est concédé sous licence, non vendu. Solo autorise 1 appareil à la fois. Team autorise jusqu’à 5 membres, chacun avec son propre compte et appareil. Votre compte et son droit d’utilisation ne peuvent pas être partagés, publiés, revendus, sous-licenciés ou transférés. Vous pouvez personnaliser configuration, glossaire, modèles et vos propres fichiers d’instructions, mais pas contourner la licence, l’activation, les limites de sièges ou la vérification des mises à jour. BugIt est un achat unique sans reconduction automatique : il accorde une licence d’un an à partir de la première activation, avec une période de grâce de 3 jours après expiration. Le présent contrat est régi par le droit japonais. Les réclamations peuvent être portées devant les tribunaux du Japon ; si vous êtes un consommateur, cela ne porte pas atteinte à votre droit d’agir devant les tribunaux de votre pays de résidence.","Taskivator ne reçoit que les données de licence/mise à jour : la connexion à votre compte BugIt (dans le navigateur, sur le Portal), un identifiant d’appareil haché à sens unique, un identifiant d’installation aléatoire, le nom de votre machine (hostname) et celui du système d’exploitation, la version de BugIt et le filtre d’offre Solo ou Team que vous choisissez, un matériel cryptographique de défi à durée de vie courte, et le droit Solo ou Team que vous approuvez pour cet appareil. Le logiciel BugIt n’utilise pas la mesure Google Ads et n’envoie aucune télémétrie produit. (Ce site web utilise Cloudflare Web Analytics pour les performances.) Vos rapports, specs, glossaire, style, corrections apprises, fichiers locaux et tokens restent sur votre appareil. Le texte du rapport va seulement au modèle IA et au tracker que vous choisissez et connectez."],"commerceTitle":"Transactions Commerciales","commerceIntro":"Informations sur le vendeur et la transaction pour BugIt, y compris les informations prévues pour la vente à distance au Japon au titre de la loi sur les transactions commerciales spécifiées (特定商取引法).","refundTitle":"Politique de remboursement","refundIntro":"Notre politique de remboursement pour l'achat de licences BugIt."}});
add("de", {"name":"Deutsch","nav":{"features":"Funktionen","integrations":"Integrationen","pricing":"Preise","docs":"Dokumentation","faq":"FAQ"},"cta":{"early":"BugIt holen","demo":"Demo ansehen","signin":"Anmelden"},"hero":{"title":"Der QA-Agent, der Ihren <span>Workflow lernt</span>.","subtitle":"Aus groben Testnotizen werden saubere, geprüfte Bug-Tickets, in Sekunden an Jira, Azure DevOps oder Ihren eigenen Tracker gesendet."},"metrics":{"saved":"zum Einreichen","dupe":"Duplikatprüfung","setup":"Einrichtung","private":"standardmäßig","savedNum":"Sekunden","dupeNum":"Automatisch","setupNum":"Geführt","privateNum":"Privat"},"under":{"features":"✓ Alle Funktionen enthalten","updates":"✓ Kostenlose Software-Updates","private":"✓ Von Haus aus privat"},"demo":{"eyebrow":"IN AKTION SEHEN","title":"Ein Agent. Verschiedene QA-Welten.","subtitle":"Für Web, Mobile, Desktop, SaaS, Enterprise-Workflows oder Spiele.","core":"Kern-Workflow","saas":"SaaS / Web-App","game":"Game-QA","mobile":"Mobile App"},"integrations":{"eyebrow":"FUNKTIONIERT MIT IHREN TOOLS","title":"Verbinden Sie die Tools, die Sie bereits nutzen.","lede":"Alle elf Tracker bringen ein integriertes, getestetes Feld-Mapping mit, und BugIt reicht in jeden davon mit einer Zugangsberechtigung ein, die Sie in Ihrem eigenen Konto anlegen: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana und Trello. BugIt prüft Ihre eigene Zugangsberechtigung gegen Ihr Ziel, bevor es die Verbindung speichert. Crash-Tools, Testmanagement und weitere Dienste binden Sie über Ihren eigenen MCP-Server ein, damit Ihr Assistent daraus lesen kann.","builtin":"INTEGRIERTES GETESTETES MAPPING","mcp":"ÜBER IHREN MCP-SERVER","crash":"CRASH & TEST","knowledge":"WISSEN & ZUSAMMENARBEIT","note":"⌁ Aktivieren Sie im Setup ein unterstütztes Tool. Einmal verbinden, überall nutzen. Speicherdienste wie Amazon S3 und Google Drive werden nicht automatisch eingerichtet."},"pricing":{"soloTitle":"EINZELLIZENZ","teamTitle":"TEAM-LIZENZ","seats":"","perYear":" Einmalzahlung","soloTerm":"1-Jahres-Solo-Lizenz · keine automatische Verlängerung","teamTerm":"1-Jahres-Team-Lizenz · keine automatische Verlängerung","limited":"Einführungspreis","soloRegular":"Regulärer Preis 59,99 $","teamRegular":"Regulärer Preis 249,99 $","soloDevice":"1 Gerät (1 Benutzer)","allFeatures":"Alle Funktionen enthalten","updates":"Kostenlose Software-Updates während der Laufzeit","docs":"Dokumentation & Anleitungen","support":"E-Mail-Support","teamDevices":"Bis zu 5 Mitglieder, jedes mit eigenem Konto","teamWorkflow":"Gemeinsamer QA-Workflow","teamConfig":"Gemeinsame Projektkonfiguration","teamSeverity":"Konsistente Schweregrade & Kategorien","teamTools":"Team-Setup-Tools","priority":"Priorisierter Support","teamCta":"BugIt Team holen","soloCta":"BugIt Solo holen"},"trust":{"privateTitle":"Von Haus aus privat","private":"Ihre Arbeit geht nur an die von Ihnen verbundene KI und den Tracker, niemals an Taskivator. Wir speichern, trainieren mit oder verkaufen Ihre Daten niemals.","telemetryTitle":"Keine Agent-Telemetrie","telemetry":"Die BugIt-Software sendet keine Produkttelemetrie. Diese Website nutzt Cloudflare Web Analytics für die Leistung.","previewTitle":"Vorschau vor dem Einreichen","preview":"Sie prüfen jedes Ticket und bestätigen jede Einreichung durch die Eingabe von FILE IT.","backupsTitle":"Lokale Backups","backups":"Ihre Einstellungen und Aktivitäten bleiben auf Ihrem Rechner. Jederzeit einfache Backups.","updatesTitle":"Sichere Updates","updates":"Updates sind kryptografisch signiert und werden vor der Installation verifiziert.","vscodeTitle":"Läuft dort, wo Sie arbeiten","vscode":"Keine separate App zu installieren. Das Einreichen ist ein Befehl und funktioniert daher in VS Code mit Copilot Chat, mit der Claude-Erweiterung und in einem normalen Terminal gleich. Sie benötigen außerdem einen KI-Assistenten und Python."},"faq":{"title":"Launch-Details ohne Überraschungen.","items":[["Legt BugIt automatisch Bugs an?","Nein. Jedes Ticket, jeder Kommentar, jeder Anhang und jede Benachrichtigung wird zuerst als Vorschau angezeigt. Vor einer irreversiblen Einreichung bestätigen Sie durch die Eingabe von FILE IT; Chat-Text allein reicht nie zum Einreichen. Ein einfaches „Ja“ reicht nicht aus. Nutzen Sie dry run, um ohne jeden Schreibvorgang zu üben."],["Welche Tracker haben integriertes, getestetes Mapping?","Alle elf Tracker bringen ein integriertes, getestetes Feld-Mapping mit, und BugIt reicht in jeden davon mit einer Zugangsberechtigung ein, die Sie in Ihrem eigenen Konto anlegen: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana und Trello. BugIt prüft Ihre eigene Zugangsberechtigung gegen Ihr Ziel, bevor es die Verbindung speichert. Crash-Tools, Testmanagement und weitere Dienste binden Sie über Ihren eigenen MCP-Server ein, damit Ihr Assistent daraus lesen kann."],["Brauche ich GitHub Copilot?","GitHub Copilot ist empfohlen und am einfachsten einzurichten. BugIt funktioniert auch mit der Claude-Erweiterung in VS Code, mit einem anderen Assistenten oder in einem einfachen Terminal. Das Einreichen ist ein Befehl und funktioniert überall gleich."],["Kann ich Claude, Gemini oder GPT nutzen?","Ja, in GitHub Copilot, sofern diese Modelle in Ihrem Plan verfügbar sind. Der Standalone-Modus unterstützt Ihren eigenen OpenAI- oder Anthropic-Schlüssel."],["Sieht Taskivator meine Arbeit?","Nein. Bug-Reports, Spezifikationen, Glossar, Screenshots, Code, Einstellungen und Tickets werden nicht an Taskivator gesendet. Es werden nur Lizenz-/Update-Daten verwendet."],["Welche Lizenz-/Update-Daten werden gesendet?","Die Anmeldung bei Ihrem BugIt-Konto (im Browser, im Portal), eine mit einem Einweg-Hash versehene Geräte-ID, eine zufällige Installationskennung, den Namen Ihres Geräts (Hostname) und des Betriebssystems, die BugIt-Version und den von Ihnen gewählten Solo- oder Team-Planfilter, kurzlebiges kryptografisches Challenge-Material und die Solo- oder Team-Berechtigung, die Sie für dieses Gerät bestätigen."],["Was ist in Team enthalten?","Der Team-Tarif ist jetzt verfügbar. Eine Einmalzahlung deckt eine 1-Jahres-Lizenz für bis zu 5 Mitglieder ab, und jedes Mitglied erhält ein eigenes BugIt-Konto, eine eigene Anmeldung und eine eigene Geräteaktivierung statt einer gemeinsamen Lizenz. Die Team-Konfiguration wird gemeinsam genutzt und zentral im Portal verwaltet, ohne automatische Verlängerung. Der Solo-Tarif ist nicht betroffen und ebenfalls verfügbar."],["Kann ich üben, ohne einzureichen?","Ja. Mit dry run erzeugen Sie einen vollständigen Bericht, ohne Tickets, Kommentare, Anhänge oder Benachrichtigungen zu erstellen. Dry run hindert die mitgelieferten BugIt-Helfer am Schreiben und weist den Agenten an, Tracker-Schreibzugriffe zu verweigern; diese Verweigerung folgt den Anweisungen von BugIt, nicht einer plattformseitigen Sperre. Verwenden Sie zum Testen daher schreibgeschützte Zugangsdaten."],["Welche Dateien darf ich gefahrlos bearbeiten?","Gefahrlos bearbeitbar sind config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md und .github/instructions/house-style.instructions.md, falls Sie sie erstellen."],["Was sollte ich nicht manuell bearbeiten?","Bearbeiten Sie nicht .github/agents/bugit-qa-agent.agent.md, andere ausgelieferte Dateien unter .github/instructions/ oder Dateien in tools/. Updates überschreiben diese Produktdateien und sie werden nicht gesichert."],["Wie funktionieren Updates?","BugIt sichert Ihre eigenen Einstellungen, prüft signierte Updates, installiert direkt im bestehenden Ordner und behält Konfiguration, Glossar, Hausstil, Lizenz und Verbindungen."],["Was passiert, wenn meine Lizenz abläuft?","Nach Ablauf der Jahreslizenz gilt eine Schonfrist von 3 Tagen; danach endet der Anspruch auf Einreichung und Aktivierung; Ihre lokalen Dateien und Einstellungen bleiben Ihnen erhalten. Ausfälle des Lizenzservers sind davon getrennt: Die zwischengespeicherte Prüfung lässt Sie bis zu 72 Stunden offline weiterarbeiten."],["Stapeln sich Verlängerungen?","Nein. Eine Verlängerung ersetzt Ihre aktuelle Aktivierung und startet ab diesem Datum eine neue Laufzeit. Verlängern Sie daher nahe am Ende Ihrer aktuellen Laufzeit."],["Wie bekomme ich Support?","Bitten Sie zuerst den KI-Assistenten um eine Diagnose und führen Sie dann Check status oder Check readiness aus. Wenn Sie weiterhin nicht weiterkommen, öffnen Sie über Ihr BugIt-Dashboard ein Support-Ticket. Vertrauliche Projektdaten müssen Sie dabei nicht angeben."]]},"docs":{"eyebrow":"DOKUMENTATION","getting":"Erste Schritte","gettingDesc":"BugIt in wenigen Minuten einrichten.","user":"Benutzerhandbuch","userDesc":"Vollständiger Leitfaden zu Funktionen und Workflows.","license":"Lizenzvertrag","licenseDesc":"Nutzungsbedingungen für BugIt lesen.","privacy":"Datenschutzrichtlinie","privacyDesc":"Wie wir Ihre Daten erheben, nutzen und schützen.","faqDesc":"Antworten auf häufige Fragen.","support":"Support","supportDesc":"Hilfe erhalten und ein Support-Ticket öffnen.","commerce":"Handelsrechtliche Angaben","commerceDesc":"Verkäufer- und Transaktionsangaben (特定商取引法に基づく表記).","refund":"Rückerstattungsrichtlinie","refundDesc":"Unsere Rückerstattungsrichtlinie mit einer Frist von 7 Tagen."},"docPages":{"homeTitle":"Dokumentation","homeIntro":"Alles, was Sie zum Installieren, Aktivieren, Anpassen und sicheren Nutzen von BugIt brauchen. Aktualisiert für BugIt QA Agent.","gettingTitle":"Erste Schritte","userTitle":"Benutzerhandbuch","licenseTitle":"Lizenzvertrag","privacyTitle":"Datenschutzrichtlinie","faqTitle":"FAQ","supportTitle":"Support","supportIntro":"Bei Setup-Problemen bitten Sie zuerst den BugIt-Assistenten um eine Diagnose und führen dann Check status oder Check readiness aus. Wenn Sie weiterhin Hilfe benötigen, öffnen Sie über Ihr BugIt-Dashboard ein Support-Ticket.","download":"PDF herunterladen","before":"Bevor Sie ein Support-Ticket öffnen","beforeText":"Geben Sie keinen vertraulichen Quellcode und keine Kundendaten, privaten Tickets, Screenshots, Tokens oder Secrets an. Beschreiben Sie das BugIt-Problem allgemein.","sections":["Installieren Sie VS Code und GitHub Copilot, entpacken Sie BugIt, öffnen Sie den BugIt-Ordner, wählen Sie BugIt QA Agent in Copilot Chat, aktivieren Sie Ihre Lizenz, akzeptieren Sie einmal die Bedingungen und geben Sie Begin setup ein. BugIt stellt Fragen in einfacher Sprache, schreibt config.json für Sie, hilft beim Verbinden Ihres Trackers, und Check readiness bestätigt, wenn Sie startklar sind.","Die tägliche Nutzung läuft über den Chat: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings und Update. Mit dry run erstellen Sie jederzeit einen vollständigen Bericht, ohne Tickets, Kommentare, Anhänge oder Benachrichtigungen zu erzeugen. Sicher anpassbar sind config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md und .github/instructions/house-style.instructions.md, falls Sie sie erstellen. Bearbeiten Sie nicht den Kern-Agenten, ausgelieferte Instruction-Dateien oder den Ordner tools von Hand; Updates überschreiben diese Produktdateien und sie werden nicht gesichert.","BugIt wird lizenziert, nicht verkauft. Solo erlaubt 1 Gerät gleichzeitig. Team erlaubt bis zu 5 Mitglieder, jeweils mit eigenem Konto und Gerät. Ihr Konto und seine Berechtigung dürfen nicht geteilt, veröffentlicht, weiterverkauft, unterlizenziert oder übertragen werden. Konfiguration, Glossar, Vorlagen und eigene Instruction-Dateien dürfen Sie anpassen, aber Lizenzierung, Aktivierung, Sitzplatzlimits und Update-Prüfung nicht umgehen. BugIt ist ein einmaliger Kauf ohne automatische Verlängerung: Der Kauf gewährt eine einjährige Lizenz ab der Erstaktivierung mit einer Schonfrist von 3 Tagen nach Ablauf. Dieser Vertrag unterliegt japanischem Recht. Ansprüche können vor den Gerichten Japans geltend gemacht werden; wenn Sie Verbraucher sind, berührt dies nicht Ihr Recht, in Ihrem Wohnsitzland Klage zu erheben.","Taskivator erhält nur Lizenz-/Update-Daten: die Anmeldung bei Ihrem BugIt-Konto (im Browser, im Portal), eine mit einem Einweg-Hash versehene Geräte-ID, eine zufällige Installationskennung, den Namen Ihres Geräts (Hostname) und des Betriebssystems, die BugIt-Version und den von Ihnen gewählten Solo- oder Team-Planfilter, kurzlebiges kryptografisches Challenge-Material und die Solo- oder Team-Berechtigung, die Sie für dieses Gerät bestätigen. Die BugIt-Software verwendet keine Google Ads-Messung und sendet keine Produkttelemetrie. (Diese Website selbst nutzt Cloudflare Web Analytics für die Leistung.) Reports, Spezifikationen, Glossar, Hausstil, gelernte Korrekturen, lokale Dateien und Tokens bleiben auf Ihrem Gerät. Berichtstext geht nur an das von Ihnen gewählte KI-Modell und den verbundenen Tracker."],"commerceTitle":"Handelsrechtliche Angaben","commerceIntro":"Verkäufer- und Transaktionsangaben zu BugIt, einschließlich der Angaben für den Versandhandel in Japan nach dem Gesetz über bestimmte Handelsgeschäfte (特定商取引法).","refundTitle":"Rückerstattungsrichtlinie","refundIntro":"Unsere Rückerstattungsrichtlinie für den Kauf von BugIt Lizenzen."}});
add("pt-br", {"name":"Português BR","nav":{"features":"Recursos","integrations":"Integrações","pricing":"Preços","docs":"Documentação","faq":"FAQ"},"cta":{"early":"Obter BugIt","demo":"Ver demo","signin":"Entrar"},"hero":{"title":"O agente QA que <span>aprende</span> seu fluxo de trabalho.","subtitle":"Transforme anotações de teste brutas em tickets de bug limpos e revisados, enviados ao Jira, Azure DevOps ou ao seu próprio tracker em segundos."},"metrics":{"saved":"para registrar","dupe":"verificação de duplicatas","setup":"configuração","private":"privado por design","savedNum":"Segundos","dupeNum":"Automático","setupNum":"Guiada","privateNum":"Privado"},"under":{"features":"✓ Todos os recursos incluídos","updates":"✓ Atualizações de software gratuitas","private":"✓ Privado por design"},"demo":{"eyebrow":"VER EM AÇÃO","title":"Um agente. Diferentes mundos de QA.","subtitle":"Use para web, mobile, desktop, SaaS, fluxos corporativos ou jogos.","core":"Fluxo principal","saas":"SaaS / App web","game":"QA de jogos","mobile":"App mobile"},"integrations":{"eyebrow":"FUNCIONA COM SUAS FERRAMENTAS","title":"Conecte as ferramentas que você já usa.","lede":"Todos os onze rastreadores incluem mapeamento de campos integrado e testado, e o BugIt registra em cada um deles com uma credencial que você cria na sua própria conta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. O BugIt valida sua própria credencial e destino antes de salvar a conexão. Ferramentas de travamento, gestão de testes e outros serviços se conectam pelo seu próprio servidor MCP para que seu assistente possa lê-los.","builtin":"MAPEAMENTO INTEGRADO E TESTADO","mcp":"PELO SEU SERVIDOR MCP","crash":"CRASH E TESTE","knowledge":"CONHECIMENTO E COLABORAÇÃO","note":"⌁ Ative uma ferramenta compatível na configuração. Conecte uma vez e use em todos os lugares. Serviços de armazenamento como Amazon S3 e Google Drive não são configurados automaticamente."},"pricing":{"soloTitle":"LICENÇA INDIVIDUAL","teamTitle":"LICENÇA DE EQUIPE","seats":"","perYear":" pagamento único","soloTerm":"Licença Solo de 1 ano · não renova automaticamente","teamTerm":"Licença Team de 1 ano · não renova automaticamente","limited":"Preço de lançamento","soloRegular":"Preço normal US$59,99","teamRegular":"Preço normal US$249,99","soloDevice":"1 dispositivo (1 usuário)","allFeatures":"Todos os recursos incluídos","updates":"Atualizações de software gratuitas enquanto ativa","docs":"Documentação e guias","support":"Suporte por email","teamDevices":"Até 5 membros, cada um com sua própria conta","teamWorkflow":"Fluxo QA compartilhado","teamConfig":"Configuração de projeto compartilhada","teamSeverity":"Severidades e categorias consistentes","teamTools":"Ferramentas de configuração de equipe","priority":"Suporte prioritário","teamCta":"Obter o BugIt Team","soloCta":"Obter o BugIt Solo"},"trust":{"privateTitle":"Privado por design","private":"Seu trabalho vai apenas para a IA e o rastreador que você conecta, nunca para a Taskivator. Nós nunca armazenamos, treinamos ou vendemos seus dados.","telemetryTitle":"Sem telemetria do agente","telemetry":"O software BugIt não envia telemetria do produto. Este site usa o Cloudflare Web Analytics para desempenho.","previewTitle":"Prévia antes de enviar","preview":"Você revisa cada ticket e aprova cada envio digitando FILE IT.","backupsTitle":"Backups locais","backups":"Suas configurações e atividades ficam na sua máquina. Backups fáceis a qualquer momento.","updatesTitle":"Atualizações seguras","updates":"As atualizações são assinadas criptograficamente e verificadas antes da instalação.","vscodeTitle":"Funciona onde você já trabalha","vscode":"Não há app separado para instalar. Registrar é um comando, então funciona igual no VS Code com o Copilot Chat ou a extensão do Claude, e num terminal comum. Você também precisa de um assistente de IA e do Python."},"faq":{"title":"Detalhes do lançamento, sem surpresas.","items":[["O BugIt registra bugs automaticamente?","Não. Cada ticket, comentário, anexo ou notificação é visualizado primeiro. Antes de registrar um ticket irreversível, você aprova digitando FILE IT; o texto do chat sozinho nunca registra nada. Um simples \"sim\" não basta. Use dry run para praticar sem nenhuma gravação."],["Quais trackers têm mapeamento integrado e testado?","Todos os onze têm mapeamento de campos integrado e testado e registram direto pela API REST de cada tracker, com uma credencial que você cria na sua própria conta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. Registrar não usa MCP. Ferramentas de travamento, gestão de testes e outros serviços continuam se conectando pelo seu próprio servidor MCP."],["Preciso do GitHub Copilot?","O GitHub Copilot é recomendado e é a configuração mais simples. O BugIt também funciona com a extensão do Claude no VS Code, com outro assistente ou em um terminal comum: registrar é um comando, então funciona igual em todos."],["Posso usar Claude, Gemini ou GPT?","Sim, dentro do GitHub Copilot quando esses modelos estiverem disponíveis no seu plano. O modo standalone aceita sua própria chave OpenAI ou Anthropic."],["A Taskivator vê meu trabalho?","Não. Relatórios, especificações, glossário, capturas, código, configurações e tickets não são enviados à Taskivator. Só são usados dados de licença/atualização."],["Quais dados de licença/atualização são enviados?","O login na sua conta BugIt (no navegador, no Portal), um ID de dispositivo com hash de mão única, um identificador de instalação aleatório, o nome do seu computador (hostname) e o do sistema operacional, a versão do BugIt e o filtro de plano Solo ou Team que você escolhe, material criptográfico de desafio de curta duração e o direito Solo ou Team que você aprova para este dispositivo."],["O que está incluído no Team?","O plano Team já está disponível. Um pagamento único cobre uma licença de 1 ano para até 5 membros, e cada membro tem sua própria conta BugIt, seu próprio login e sua própria ativação de dispositivo, em vez de uma licença compartilhada. A configuração da equipe é compartilhada e gerenciada de forma centralizada no Portal, e não renova automaticamente. O plano Solo não é afetado e também está disponível."],["Posso praticar sem registrar nada?","Sim. Use dry run para gerar o relatório completo sem criar tickets, comentários, anexos ou notificações. Dry run impede que os helpers integrados do BugIt escrevam e instrui o agente a recusar escritas no tracker; essa recusa segue as instruções do BugIt, não um bloqueio de plataforma, então use credenciais somente leitura ao avaliar."],["Quais arquivos posso editar com segurança?","Você pode editar config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md e .github/instructions/house-style.instructions.md se criá-lo."],["O que não devo editar manualmente?","Não edite .github/agents/bugit-qa-agent.agent.md, outros arquivos enviados em .github/instructions/ nem nada em tools/. Atualizações sobrescrevem esses arquivos do produto e eles não têm backup."],["Como funcionam as atualizações?","O BugIt faz backup dos seus arquivos de configuração, verifica atualizações assinadas, instala no lugar e preserva config, glossário, estilo da casa, licença e conexões."],["O que acontece quando minha licença expira?","Há um período de carência de 3 dias após o fim da licença anual. Se o servidor de licenças cair, a verificação em cache permite até 72 horas de trabalho offline."],["As renovações acumulam?","Não. Uma renovação substitui sua ativação atual e inicia um novo período nessa data. Renove perto do fim do período atual."],["Como recebo suporte?","Primeiro peça ao assistente de IA para diagnosticar o problema e rode Check status ou Check readiness. Se ainda estiver com dificuldade, abra um chamado de suporte no seu painel do BugIt, sem precisar incluir detalhes confidenciais do projeto."]]},"docs":{"eyebrow":"DOCUMENTAÇÃO","getting":"Primeiros passos","gettingDesc":"Configure o BugIt em minutos.","user":"Guia do usuário","userDesc":"Guia completo de recursos e fluxos.","license":"Contrato de licença","licenseDesc":"Termos de uso do BugIt.","privacy":"Política de privacidade","privacyDesc":"Como coletamos, usamos e protegemos seus dados.","faqDesc":"Respostas para perguntas comuns.","support":"Suporte","supportDesc":"Receba ajuda e abra um chamado de suporte.","commerce":"Transações Comerciais","commerceDesc":"Dados do vendedor e da transação (特定商取引法に基づく表記).","refund":"Política de reembolso","refundDesc":"Nossa política de reembolso de 7 dias."},"docPages":{"homeTitle":"Documentação","homeIntro":"Documentação atualizada para o BugIt QA Agent: instalação, ativação, personalização e uso seguro.","gettingTitle":"Primeiros passos","userTitle":"Guia do usuário","licenseTitle":"Contrato de licença","privacyTitle":"Política de privacidade","faqTitle":"FAQ","supportTitle":"Suporte","supportIntro":"Para problemas de configuração, primeiro peça ao assistente do BugIt para diagnosticar o problema e rode Check status ou Check readiness. Se ainda precisar de ajuda, abra um chamado de suporte no seu painel do BugIt.","download":"Baixar PDF","before":"Antes de abrir um chamado de suporte","beforeText":"Não inclua código-fonte confidencial, dados de clientes, tickets privados, capturas, tokens ou segredos. Descreva o problema do BugIt em termos gerais.","sections":["Instale VS Code e GitHub Copilot, descompacte o BugIt, abra a pasta, escolha BugIt QA Agent no Copilot Chat, ative sua licença, aceite os termos uma vez e digite Begin setup. O BugIt faz perguntas simples, grava config.json, ajuda a conectar seu rastreador e Check readiness confirma quando está pronto.","O uso diário é pelo chat: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings e Update. Use dry run para gerar um relatório completo sem criar tickets, comentários, anexos ou notificações. Personalização segura fica em config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md e .github/instructions/house-style.instructions.md se você criar. Não edite manualmente o agente principal, arquivos de instruções enviados ou a pasta tools; atualizações sobrescrevem esses arquivos e eles não têm backup.","O BugIt é licenciado, não vendido. Solo permite 1 dispositivo por vez. Team permite até 5 membros, cada um com sua própria conta e dispositivo. Sua conta e seu direito de uso não podem ser compartilhados, publicados, revendidos, sublicenciados ou transferidos. Você pode personalizar configuração, glossário, modelos e seus próprios arquivos de instruções, mas não pode contornar licença, ativação, limites de assentos ou verificação de atualização. O BugIt é uma compra única que não se renova automaticamente: concede uma licença de um ano a partir da primeira ativação, com um período de carência de 3 dias após expirar. Este contrato é regido pelas leis do Japão. As reivindicações podem ser propostas nos tribunais do Japão; se você for consumidor, isso não afeta seu direito de propor ação nos tribunais do seu país de residência.","A Taskivator recebe apenas dados de licença/atualização: o login na sua conta BugIt (no navegador, no Portal), um ID de dispositivo com hash de mão única, um identificador de instalação aleatório, o nome do seu computador (hostname) e o do sistema operacional, a versão do BugIt e o filtro de plano Solo ou Team que você escolhe, material criptográfico de desafio de curta duração e o direito Solo ou Team que você aprova para este dispositivo. O software BugIt não usa a medição do Google Ads nem envia telemetria do produto. (Este site usa o Cloudflare Web Analytics para desempenho.) Relatórios, specs, glossário, estilo, correções aprendidas, arquivos locais e tokens ficam no seu dispositivo. O texto do relatório vai apenas para o modelo de IA e o tracker que você escolheu e conectou."],"commerceTitle":"Transações Comerciais","commerceIntro":"Informações sobre o vendedor e a transação do BugIt, incluindo as informações previstas para vendas a distância no Japão sob a Lei de Transações Comerciais Especificadas (特定商取引法).","refundTitle":"Política de reembolso","refundIntro":"Nossa política de reembolso para a compra de licenças do BugIt."}});
add("it", {"name":"Italiano","nav":{"features":"Funzioni","integrations":"Integrazioni","pricing":"Prezzi","docs":"Documentazione","faq":"FAQ"},"cta":{"early":"Ottieni BugIt","demo":"Guarda demo","signin":"Accedi"},"hero":{"title":"L’agente QA che <span>impara</span> il tuo workflow.","subtitle":"Trasforma note di test grezze in ticket puliti e revisionati, inviati a Jira, Azure DevOps o al tuo tracker in pochi secondi."},"metrics":{"saved":"per inviare","dupe":"controllo duplicati","setup":"configurazione","private":"privato per design","savedNum":"Secondi","dupeNum":"Automatico","setupNum":"Guidata","privateNum":"Privato"},"under":{"features":"✓ Tutte le funzioni incluse","updates":"✓ Aggiornamenti software gratuiti","private":"✓ Privato per design"},"demo":{"eyebrow":"GUARDALO IN AZIONE","title":"Un solo agente. Mondi QA diversi.","subtitle":"Usalo per web, mobile, desktop, SaaS, flussi di lavoro enterprise o videogiochi.","core":"Flusso principale","saas":"SaaS / Web App","game":"QA videogiochi","mobile":"App mobile"},"integrations":{"eyebrow":"FUNZIONA CON I TUOI STRUMENTI","title":"Collega ciò che usi già.","lede":"Tutti e undici i tracker includono una mappatura dei campi integrata e testata, e BugIt crea i ticket in ognuno di essi con una credenziale che crei nel tuo account: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. BugIt convalida la tua credenziale e la destinazione prima di salvare la connessione. Strumenti di crash, gestione dei test e altri servizi si collegano tramite il tuo server MCP così che l'assistente possa leggerli.","builtin":"MAPPATURA INTEGRATA E TESTATA","mcp":"TRAMITE IL TUO SERVER MCP","crash":"CRASH E TEST","knowledge":"CONOSCENZA E COLLABORAZIONE","note":"⌁ Attiva uno strumento supportato nella configurazione. Collega una volta e usa ovunque. Servizi di archiviazione come Amazon S3 e Google Drive non vengono configurati automaticamente."},"pricing":{"soloTitle":"LICENZA SINGOLA","teamTitle":"LICENZA TEAM","seats":"","perYear":" pagamento unico","soloTerm":"Licenza Solo di 1 anno · non si rinnova automaticamente","teamTerm":"Licenza Team di 1 anno · non si rinnova automaticamente","limited":"Prezzo di lancio","soloRegular":"Prezzo normale $59.99","teamRegular":"Prezzo normale $249.99","soloDevice":"1 dispositivo (1 utente)","allFeatures":"Tutte le funzioni incluse","updates":"Aggiornamenti software gratuiti durante la licenza","docs":"Documentazione e guide","support":"Supporto via email","teamDevices":"Fino a 5 membri, ciascuno con il proprio account","teamWorkflow":"Workflow QA condiviso","teamConfig":"Configurazione progetto condivisa","teamSeverity":"Severità e categorie coerenti","teamTools":"Strumenti di configurazione team","priority":"Supporto prioritario","teamCta":"Ottieni BugIt Team","soloCta":"Ottieni BugIt Solo"},"trust":{"privateTitle":"Privato per design","private":"Il tuo lavoro va solo all'IA e al tracker che colleghi, mai a Taskivator. Non archiviamo, non addestriamo modelli e non vendiamo mai i tuoi dati.","telemetryTitle":"Nessuna telemetria dell’agente","telemetry":"Il software BugIt non invia telemetria del prodotto. Questo sito web usa Cloudflare Web Analytics per le prestazioni.","previewTitle":"Anteprima prima dell’invio","preview":"Rivedi ogni ticket e approvi ogni invio digitando FILE IT.","backupsTitle":"Backup locali","backups":"Le tue impostazioni e la tua attività restano sul tuo computer. Backup semplici in qualsiasi momento.","updatesTitle":"Aggiornamenti sicuri","updates":"Gli aggiornamenti sono firmati crittograficamente e verificati prima dell’installazione.","vscodeTitle":"Funziona dove lavori già","vscode":"Nessuna app separata da installare. Creare un ticket è un comando, quindi funziona allo stesso modo in VS Code con Copilot Chat o l’estensione Claude e in un normale terminale. Servono anche un assistente IA e Python."},"faq":{"title":"Dettagli di lancio, senza sorprese.","items":[["BugIt crea bug automaticamente?","No. Ogni ticket, commento, allegato o notifica viene prima mostrato in anteprima. Prima di creare un ticket irreversibile, lo approvi digitando FILE IT; il solo testo della chat non crea mai nulla. Un semplice «sì» non basta. Usi dry run per esercitarsi senza alcuna scrittura."],["Quali tracker hanno mapping integrato e testato?","Tutti e undici hanno mapping dei campi integrato e testato e creano i ticket direttamente tramite l’API REST di ciascun tracker, con una credenziale che crei nel tuo account: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. La creazione non usa MCP. Strumenti di crash, gestione dei test e altri servizi si collegano ancora tramite il tuo server MCP."],["Mi serve GitHub Copilot?","GitHub Copilot è consigliato ed è la configurazione più semplice. BugIt funziona anche con l’estensione Claude in VS Code, con un altro assistente o in un semplice terminale: la creazione è un comando, quindi funziona allo stesso modo ovunque."],["Posso usare Claude, Gemini o GPT?","Sì, dentro GitHub Copilot quando quei modelli sono disponibili nel tuo piano. La modalità standalone supporta una tua chiave OpenAI o Anthropic."],["Taskivator vede il mio lavoro?","No. Report, specifiche, glossario, screenshot, codice, impostazioni e ticket non vengono inviati a Taskivator. Vengono usati solo dati di licenza/aggiornamento."],["Quali dati di licenza/aggiornamento vengono inviati?","L’accesso al suo account BugIt (nel browser, nel Portal), un ID dispositivo con hash a senso unico, un identificatore di installazione casuale, il nome del suo computer (hostname) e quello del sistema operativo, la versione di BugIt e il filtro di piano Solo o Team che sceglie, materiale crittografico di sfida di breve durata e il diritto Solo o Team che approva per questo dispositivo."],["Cosa include Team?","Il piano Team è disponibile ora. Un pagamento unico copre una licenza di 1 anno per un massimo di 5 membri: ogni membro ha il proprio account BugIt, il proprio login e la propria attivazione del dispositivo, invece di una licenza condivisa. La configurazione del team è condivisa e gestita centralmente nel Portale e non si rinnova automaticamente. Il piano Solo non è interessato ed è disponibile anch’esso."],["Posso fare pratica senza inviare?","Sì. Usa dry run per generare il report completo senza creare ticket, commenti, allegati o notifiche. Dry run impedisce ai helper integrati di BugIt di scrivere e dice all’agente di rifiutare le scritture sul tracker; quel rifiuto segue le istruzioni di BugIt, non un blocco della piattaforma, quindi usa credenziali di sola lettura durante la valutazione."],["Quali file posso modificare in sicurezza?","Puoi modificare config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md e .github/instructions/house-style.instructions.md se lo crei."],["Cosa non devo modificare a mano?","Non modificare .github/agents/bugit-qa-agent.agent.md, altri file distribuiti in .github/instructions/ o qualsiasi cosa in tools/. Gli aggiornamenti sovrascrivono questi file del prodotto e non sono inclusi nei backup."],["Come funzionano gli aggiornamenti?","BugIt esegue il backup dei file di configurazione di tua proprietà, verifica gli aggiornamenti firmati, installa sul posto e conserva config, glossario, stile dei ticket, licenza e connessioni."],["Cosa succede quando la licenza scade?","Dopo il termine annuale c’è un periodo di grazia di 3 giorni. Se il server licenze non è raggiungibile, la verifica in cache permette fino a 72 ore di lavoro offline."],["I rinnovi si sommano?","No. Un rinnovo sostituisce la tua attivazione corrente e avvia un nuovo periodo da quella data. Rinnova vicino alla fine del periodo attuale."],["Come ricevo supporto?","Prima chiedi all’assistente IA di diagnosticare il problema, poi esegui Check status o Check readiness. Se sei ancora bloccato, apri un ticket di supporto dalla tua dashboard BugIt, senza bisogno di includere dati riservati del progetto."]]},"docs":{"eyebrow":"DOCUMENTAZIONE","getting":"Introduzione","gettingDesc":"Configura BugIt in pochi minuti.","user":"Guida utente","userDesc":"Guida completa a funzioni e workflow.","license":"Contratto di licenza","licenseDesc":"Termini per usare BugIt.","privacy":"Informativa sulla privacy","privacyDesc":"Come raccogliamo, usiamo e proteggiamo i dati.","faqDesc":"Risposte alle domande comuni.","support":"Supporto","supportDesc":"Ottieni aiuto e apri un ticket di supporto.","commerce":"Transazioni Commerciali","commerceDesc":"Dati del venditore e della transazione (特定商取引法に基づく表記).","refund":"Politica di rimborso","refundDesc":"La nostra politica di rimborso di 7 giorni."},"docPages":{"homeTitle":"Documentazione","homeIntro":"Documentazione aggiornata per BugIt QA Agent: installazione, attivazione, personalizzazione e uso sicuro.","gettingTitle":"Introduzione","userTitle":"Guida utente","licenseTitle":"Contratto di licenza","privacyTitle":"Informativa sulla privacy","faqTitle":"FAQ","supportTitle":"Supporto","supportIntro":"Per problemi di configurazione, chiedi prima all’assistente BugIt di diagnosticare il problema, poi esegui Check status o Check readiness. Se serve ancora aiuto, apri un ticket di supporto dalla tua dashboard BugIt.","download":"Scarica PDF","before":"Prima di aprire un ticket di supporto","beforeText":"Non includere codice sorgente riservato, dati clienti, ticket privati, screenshot, token o segreti. Descrivi il problema di BugIt in termini generali.","sections":["Installa VS Code e GitHub Copilot, decomprimi BugIt, apri la cartella, scegli BugIt QA Agent in Copilot Chat, attiva la licenza, accetta i termini una volta e digita Begin setup. BugIt fa domande semplici, scrive config.json, aiuta a collegare il tracker e Check readiness conferma quando sei pronto.","L’uso quotidiano è via chat: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings e Update. Usa dry run per generare un report completo senza creare ticket, commenti, allegati o notifiche. La personalizzazione sicura vive in config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md e .github/instructions/house-style.instructions.md se lo crei. Non modificare a mano l’agente core, i file instruction distribuiti o la cartella tools; gli aggiornamenti li sovrascrivono e non sono inclusi nei backup.","BugIt è concesso in licenza, non venduto. Solo consente 1 dispositivo alla volta. Team consente fino a 5 membri, ciascuno con il proprio account e dispositivo. Il tuo account e il relativo diritto d’uso non possono essere condivisi, pubblicati, rivenduti, sublicenziati o trasferiti. Puoi personalizzare configurazione, glossario, template e i tuoi file instruction, ma non puoi aggirare licenza, attivazione, limiti delle postazioni o verifica aggiornamenti. BugIt è un acquisto una tantum che non si rinnova automaticamente: concede una licenza di un anno dalla prima attivazione, con un periodo di grazia di 3 giorni dopo la scadenza. Il presente contratto è regolato dalla legge giapponese. Le richieste possono essere presentate ai tribunali del Giappone; se è un consumatore, ciò non pregiudica il suo diritto di agire davanti ai tribunali del suo paese di residenza.","Taskivator riceve solo dati di licenza/aggiornamento: l’accesso al suo account BugIt (nel browser, nel Portal), un ID dispositivo con hash a senso unico, un identificatore di installazione casuale, il nome del suo computer (hostname) e quello del sistema operativo, la versione di BugIt e il filtro di piano Solo o Team che sceglie, materiale crittografico di sfida di breve durata e il diritto Solo o Team che approva per questo dispositivo. Il software BugIt non utilizza la misurazione di Google Ads né invia telemetria del prodotto. (Questo sito web usa Cloudflare Web Analytics per le prestazioni.) Report, specifiche, glossario, stile, correzioni apprese, file locali e token restano sul tuo dispositivo. Il testo del report va solo al modello IA e al tracker che scegli e colleghi."],"commerceTitle":"Transazioni Commerciali","commerceIntro":"Informazioni sul venditore e sulla transazione per BugIt, comprese le informazioni previste per le vendite a distanza in Giappone ai sensi della Legge sulle transazioni commerciali specificate (特定商取引法).","refundTitle":"Politica di rimborso","refundIntro":"La nostra politica di rimborso per l'acquisto di licenze BugIt."}});
add("ko", {"name":"한국어","nav":{"features":"기능","integrations":"연동","pricing":"가격","docs":"문서","faq":"FAQ"},"cta":{"early":"BugIt 받기","demo":"데모 보기","signin":"로그인"},"hero":{"title":"워크플로를 <span>학습하는</span> QA 에이전트.","subtitle":"대략적인 테스트 메모를 검토를 거친 깔끔한 버그 티켓으로 바꾸어 몇 초 만에 Jira, Azure DevOps 또는 사용하는 추적기에 등록합니다."},"metrics":{"saved":"만에 등록","dupe":"중복 검사","setup":"설정","private":"설계 기반","savedNum":"몇 초","dupeNum":"자동","setupNum":"가이드","privateNum":"비공개"},"under":{"features":"✓ 모든 기능 포함","updates":"✓ 무료 소프트웨어 업데이트","private":"✓ 설계 기반 프라이버시"},"demo":{"eyebrow":"실제 작동 보기","title":"하나의 에이전트, 다양한 QA 환경.","subtitle":"웹, 모바일, 데스크톱, SaaS, 엔터프라이즈 워크플로, 게임까지 자유롭게 활용하세요.","core":"핵심 워크플로","saas":"SaaS / 웹 앱","game":"게임 QA","mobile":"모바일 앱"},"integrations":{"eyebrow":"사용하는 도구와 연동","title":"이미 쓰고 있는 도구를 연결하세요.","lede":"열한 개 추적 시스템 모두에 검증된 필드 매핑이 기본으로 내장되어 있으며, BugIt은 사용자가 자신의 계정에서 만든 자격 증명으로 그 전부에 등록합니다: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana, Trello. BugIt은 연결을 저장하기 전에 사용자의 자격 증명을 선택한 대상에 대해 확인합니다. 크래시 도구와 테스트 관리 등 다른 서비스는 사용자의 MCP 서버로 연결해 어시스턴트가 읽을 수 있습니다.","builtin":"검증된 매핑 기본 내장","mcp":"직접 운영하는 MCP 서버로","crash":"크래시 & 테스트","knowledge":"지식 & 협업","note":"⌁ 설정에서 지원되는 도구를 켜세요. 한 번만 연결하면 어디서나 사용할 수 있습니다. Amazon S3나 Google Drive 같은 스토리지 서비스는 자동으로 설정되지 않습니다."},"pricing":{"soloTitle":"솔로 라이선스","teamTitle":"팀 라이선스","seats":"","perYear":" 1회 결제","soloTerm":"1년 Solo 라이선스 · 자동 갱신 없음","teamTerm":"1년 Team 라이선스 · 자동 갱신 없음","limited":"출시 기념 가격","soloRegular":"정가 $59.99","teamRegular":"정가 $249.99","soloDevice":"기기 1대 (사용자 1명)","allFeatures":"모든 기능 포함","updates":"활성 기간 동안 무료 소프트웨어 업데이트","docs":"문서 및 가이드","support":"이메일 지원","teamDevices":"최대 5명, 각자 자신의 계정 사용","teamWorkflow":"공유 QA 워크플로","teamConfig":"공유 프로젝트 설정","teamSeverity":"일관된 심각도 및 카테고리","teamTools":"팀 설정 도구","priority":"우선 지원","teamCta":"BugIt Team 구매","soloCta":"BugIt Solo 구매"},"trust":{"privateTitle":"설계부터 프라이버시 중심","private":"작업 내용은 사용자가 연결한 AI와 트래커로만 전송되며, Taskivator로는 전송되지 않습니다. 데이터를 저장하거나 학습에 사용하거나 판매하지 않습니다.","telemetryTitle":"에이전트 텔레메트리 없음","telemetry":"BugIt 소프트웨어는 제품 텔레메트리를 전송하지 않습니다. 이 웹사이트는 성능을 위해 Cloudflare Web Analytics를 사용합니다.","previewTitle":"등록 전 미리 보기","preview":"모든 티켓을 검토하고 FILE IT을 입력해 승인해 등록합니다.","backupsTitle":"로컬 백업","backups":"설정과 활동 내역은 사용자의 기기에 저장됩니다. 언제든 손쉽게 백업할 수 있습니다.","updatesTitle":"안전한 업데이트","updates":"업데이트는 암호화 서명되며 설치 전에 검증됩니다.","vscodeTitle":"사용하던 환경에서 그대로","vscode":"별도의 앱을 설치할 필요가 없습니다. 등록은 명령이므로 VS Code의 Copilot Chat에서도, Claude 확장에서도, 일반 터미널에서도 똑같이 동작합니다. 이 외에 AI 어시스턴트와 Python이 필요합니다."},"faq":{"title":"구매 전 궁금한 점을 명확하게.","items":[["BugIt이 자동으로 버그를 등록하나요?","아니요. 모든 티켓, 댓글, 첨부, 알림은 먼저 미리 보기로 표시됩니다. 되돌릴 수 없는 티켓 등록 전에는 FILE IT을 입력해 승인해야 하며, 채팅 문구만으로는 등록되지 않습니다. 단순히 \"예\"만으로는 진행되지 않습니다. 쓰기 없이 연습하려면 dry run을 사용하세요."],["내장 검증 매핑이 있는 추적기는 무엇인가요?","열한 개 추적 시스템에는 모두 테스트된 필드 매핑이 내장되어 있으며, 각 시스템의 REST API를 통해 직접 티켓을 등록합니다. 티켓 등록에는 MCP를 사용하지 않습니다. 크래시 도구, 테스트 관리 및 기타 서비스는 사용자가 준비한 MCP 서버를 통해 연결됩니다."],["GitHub Copilot이 필요한가요?","GitHub Copilot이 가장 간편하며 권장되는 설정입니다. BugIt은 VS Code의 Claude 확장, 다른 어시스턴트, 또는 일반 터미널에서도 동작합니다. 등록은 명령이므로 어디서나 동일하게 작동합니다."],["Claude, Gemini 또는 GPT를 사용할 수 있나요?","네. GitHub Copilot에서 해당 모델이 사용자의 플랜에 제공되는 경우 사용할 수 있습니다. standalone 모드는 사용자의 OpenAI 또는 Anthropic 키를 지원합니다."],["Taskivator가 제 작업을 볼 수 있나요?","아니요. 버그 보고서, 사양, 용어집, 스크린샷, 코드, 설정, 티켓은 Taskivator로 전송되지 않습니다. 라이선스/업데이트 데이터만 사용됩니다."],["어떤 라이선스/업데이트 데이터가 전송되나요?","브라우저의 Portal에서 이루어지는 BugIt 계정 로그인, 단방향 해시된 기기 ID, 무작위 설치 식별자, 기기 이름(호스트명)과 운영체제 이름, BugIt 버전과 선택한 Solo 또는 Team 플랜 필터, 수명이 짧은 암호화 챌린지 자료, 그리고 이 기기에 대해 승인하는 Solo 또는 Team 권한입니다."],["Team에는 무엇이 포함되나요?","BugIt Team을 지금 이용할 수 있습니다. 1회 결제로 최대 5명을 위한 1년 라이선스를 제공합니다. 공유 라이선스 대신 각 구성원이 자신의 BugIt 계정, 자신의 로그인, 자신의 기기 활성화를 갖습니다. 팀 구성은 공유되며 포털에서 중앙 관리되고, 자동 갱신이 없습니다. Solo 요금제는 영향을 받지 않으며 함께 이용할 수 있습니다."],["등록 없이 연습할 수 있나요?","네. dry run을 사용하면 티켓, 댓글, 첨부, 알림을 만들지 않고 전체 보고서를 생성할 수 있습니다. dry run은 BugIt에 포함된 도우미의 쓰기를 막고 에이전트에 트래커 쓰기를 거부하도록 지시합니다. 이 거부는 플랫폼 잠금이 아니라 BugIt의 지시를 따르므로, 평가할 때는 읽기 전용 자격 증명을 사용하세요."],["안전하게 수정할 수 있는 파일은 무엇인가요?","config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md, 그리고 직접 만든 .github/instructions/house-style.instructions.md는 안전하게 수정할 수 있는 사용자 소유 파일입니다."],["직접 수정하면 안 되는 파일은 무엇인가요?",".github/agents/bugit-qa-agent.agent.md, .github/instructions/ 아래에 배포된 다른 파일, tools/ 안의 파일은 직접 수정하지 마세요. 업데이트가 이 제품 파일들을 덮어쓰며 백업되지 않습니다."],["업데이트는 어떻게 작동하나요?","BugIt은 사용자 소유 설정을 백업하고, 서명된 업데이트를 검증한 뒤, config, 용어집, 하우스 스타일, 라이선스, 연결을 유지하며 제자리에서 설치합니다."],["라이선스가 만료되면 어떻게 되나요?","라이선스 기간이 끝나면 3일의 유예 기간이 적용되며, 그 이후 등록과 활성화에는 유효한 라이선스가 필요합니다. 로컬 파일과 설정은 그대로 유지됩니다. 라이선스 서버 장애는 별개로, 캐시된 검증을 통해 최대 72시간 동안 오프라인으로 계속 작업할 수 있습니다."],["갱신 기간이 누적되나요?","아니요. 갱신하면 현재 활성화를 대체하고 그 시점부터 새 기간이 시작되므로, 현재 기간이 끝날 무렵에 갱신하세요."],["지원은 어떻게 받나요?","먼저 AI 어시스턴트에게 문제 진단을 요청한 뒤 Check status 또는 Check readiness를 실행하세요. 그래도 해결되지 않으면 BugIt 대시보드에서 지원 티켓을 등록하세요. 기밀 프로젝트 정보는 포함하지 않아도 됩니다."]]},"docs":{"eyebrow":"문서","getting":"시작하기","gettingDesc":"몇 분 만에 BugIt을 설정하세요.","user":"사용자 가이드","userDesc":"기능과 워크플로에 대한 완전한 가이드입니다.","license":"라이선스 계약","licenseDesc":"BugIt 사용 약관을 확인하세요.","privacy":"개인정보 처리방침","privacyDesc":"데이터를 수집, 사용, 보호하는 방식을 안내합니다.","faqDesc":"자주 묻는 질문에 대한 답변입니다.","support":"지원","supportDesc":"도움을 받고 지원 티켓을 등록하세요.","commerce":"상거래 표기","commerceDesc":"판매자 및 거래 정보 (特定商取引法に基づく表記).","refund":"환불 정책","refundDesc":"7일 환불 정책 안내입니다."},"docPages":{"homeTitle":"문서","homeIntro":"BugIt을 설치, 활성화, 사용자 지정하고 안전하게 사용하는 데 필요한 모든 내용을 담았습니다. BugIt QA Agent 기준으로 업데이트되었습니다.","gettingTitle":"시작하기","userTitle":"사용자 가이드","licenseTitle":"라이선스 계약","privacyTitle":"개인정보 처리방침","faqTitle":"FAQ","supportTitle":"지원","supportIntro":"설정 문제가 있으면 먼저 BugIt 어시스턴트에게 진단을 요청한 뒤 Check status 또는 Check readiness를 실행하세요. 그래도 도움이 필요하면 BugIt 대시보드에서 지원 티켓을 등록하세요.","download":"PDF 다운로드","before":"지원 티켓을 등록하기 전에","beforeText":"기밀 소스 코드, 고객 데이터, 비공개 티켓, 스크린샷, 토큰 또는 비밀 정보를 포함하지 마세요. BugIt 문제를 개괄적으로 설명하세요.","sections":["VS Code와 GitHub Copilot을 설치하고, BugIt을 압축 해제한 뒤 BugIt 폴더를 열고, Copilot Chat에서 BugIt QA Agent를 선택하고, 라이선스를 활성화하고, 약관에 한 번 동의한 다음 Begin setup을 입력하세요. BugIt은 쉬운 말로 질문하고 config.json을 대신 작성하며 추적 시스템을 연결하도록 돕고, Check readiness로 준비가 되었는지 확인합니다.","일상적인 사용은 채팅 중심입니다: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings, Update. 티켓, 댓글, 첨부, 알림을 만들지 않고 전체 보고서를 원할 때는 언제든 dry run을 사용하세요. 안전하게 사용자 지정할 수 있는 파일은 config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md, 그리고 직접 만든 .github/instructions/house-style.instructions.md입니다. 핵심 agent, 배포된 instruction 파일, tools 폴더는 직접 수정하지 마세요. 업데이트가 이 제품 파일들을 덮어쓰며 백업되지 않습니다.","BugIt은 판매가 아니라 라이선스로 제공됩니다. Solo는 동시에 기기 1대를 허용하고, Team은 최대 5명으로 각 구성원이 자신의 계정과 기기를 가집니다. 계정과 그 이용 권한은 공유, 공개, 재판매, 재라이선스 또는 양도할 수 없습니다. 설정, 용어집, 템플릿, 사용자 본인의 instruction 파일은 사용자 지정할 수 있지만, 라이선스, 활성화, 좌석 제한 또는 업데이트 검증을 우회할 수는 없습니다. BugIt은 자동 갱신이 없는 일회성 구매입니다. 구매 시 첫 활성화부터 1년 라이선스가 부여되며, 만료 후 3일의 유예 기간이 있습니다. 본 계약은 일본 법률의 적용을 받습니다. 청구는 일본 법원에 제기할 수 있으며, 소비자인 경우 이는 거주 국가의 법원에 소송을 제기할 권리에 영향을 주지 않습니다.","Taskivator로 전송되는 것은 라이선스/업데이트 데이터뿐입니다: 브라우저의 Portal에서 이루어지는 BugIt 계정 로그인, 단방향 해시된 기기 ID, 무작위 설치 식별자, 기기 이름(호스트명)과 운영체제 이름, BugIt 버전과 선택한 Solo 또는 Team 플랜 필터, 수명이 짧은 암호화 챌린지 자료, 그리고 이 기기에 대해 승인하는 Solo 또는 Team 권한입니다. BugIt 소프트웨어는 Google Ads 측정을 사용하지 않으며 제품 텔레메트리도 전송하지 않습니다. (이 웹사이트 자체는 성능을 위해 Cloudflare Web Analytics를 사용합니다.) 리포트, 사양, 용어집, house style, 학습된 수정, 로컬 파일, 토큰은 기기에 남습니다. 리포트 텍스트는 사용자가 선택하고 연결한 AI 모델과 트래커로만 이동합니다."],"commerceTitle":"상거래 표기","commerceIntro":"BugIt의 판매자 및 거래 정보이며, 일본 특정상거래법(特定商取引法)에 따른 통신판매 표기를 포함합니다.","refundTitle":"환불 정책","refundIntro":"BugIt 라이선스 구매에 대한 환불 정책입니다."}});
add("zh", {"name":"中文","nav":{"features":"功能","integrations":"集成","pricing":"价格","docs":"文档","faq":"FAQ"},"cta":{"early":"获取 BugIt","demo":"观看演示","signin":"登录"},"hero":{"title":"会学习你工作流的 <span>QA 智能体</span>。","subtitle":"把粗略的测试笔记变成清晰、已审阅的缺陷单，并在几秒内提交到 Jira、Azure DevOps 或你自己的跟踪器。"},"metrics":{"saved":"即可提交","dupe":"重复检查","setup":"设置","private":"隐私设计","savedNum":"数秒","dupeNum":"自动","setupNum":"引导式","privateNum":"私密"},"under":{"features":"✓ 包含全部功能","updates":"✓ 免费软件更新","private":"✓ 隐私优先设计"},"demo":{"eyebrow":"实战演示","title":"一个智能体，玩转各类 QA 场景。","subtitle":"适用于网页、移动端、桌面端、SaaS、企业级工作流乃至游戏。","core":"核心工作流","saas":"SaaS / 网页应用","game":"游戏 QA","mobile":"移动应用"},"integrations":{"eyebrow":"无缝对接你的工具","title":"连接你已在使用的工具。","lede":"全部十一个跟踪系统都内置经过测试的字段映射，BugIt 使用你在自己账户中创建的凭据向其中每一个提交：Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana 和 Trello。在保存连接之前，BugIt 会先验证你的凭据和目标位置。崩溃分析工具、测试管理等其他服务通过你自己的 MCP 服务器连接，供助手读取。","builtin":"内置已测试映射","mcp":"通过你的 MCP 服务器","crash":"崩溃与测试","knowledge":"知识与协作","note":"⌁ 在设置中启用受支持的工具。连接一次，处处可用。Amazon S3、Google Drive 等存储服务不会自动配置。"},"pricing":{"soloTitle":"单人许可","teamTitle":"团队许可","seats":"","perYear":" 一次性付款","soloTerm":"1 年期 Solo 授权 · 不自动续订","teamTerm":"1 年期 Team 许可证 · 不自动续订","limited":"尝鲜价","soloRegular":"常规价格 $59.99","teamRegular":"常规价格 $249.99","soloDevice":"1 台设备（单个用户）","allFeatures":"包含全部功能","updates":"有效期内免费获得软件更新","docs":"文档与指南","support":"邮件支持","teamDevices":"最多 5 名成员，每人拥有各自的账户","teamWorkflow":"共享 QA 工作流","teamConfig":"共享项目配置","teamSeverity":"一致的严重程度和类别","teamTools":"团队设置工具","priority":"优先支持","teamCta":"获取 BugIt Team","soloCta":"获取 BugIt Solo"},"trust":{"privateTitle":"隐私优先设计","private":"你的工作内容仅发送到你连接的 AI 和跟踪系统，绝不发送给 Taskivator。我们绝不存储、训练或出售你的数据。","telemetryTitle":"无代理遥测","telemetry":"BugIt 软件不发送产品遥测数据。本网站为提升性能使用 Cloudflare Web Analytics。","previewTitle":"提交前先预览","preview":"每条工单都由你审核，输入 FILE IT 进行批准后提交。","backupsTitle":"本地备份","backups":"你的设置与操作记录都保存在本机。随时轻松备份。","updatesTitle":"安全更新","updates":"更新经过加密签名，安装前均会验证。","vscodeTitle":"在你惯用的环境中运行","vscode":"无需安装其他应用。提交是一条命令，因此在 VS Code 的 Copilot Chat、Claude 扩展或普通终端中都同样可用。此外还需要一个 AI 助手和 Python。"},"faq":{"title":"上线细节，绝无意外。","items":[["BugIt 会自动提交缺陷吗？","不会。每个工单、评论、附件或通知都会先预览。执行不可撤销的工单提交前，需要输入 FILE IT 进行批准；仅靠聊天文字永远不会提交。仅输入\"是\"不会执行操作。想零写入地练习，请使用 dry run。"],["哪些跟踪器有内置且已测试的字段映射？","全部十一个都提供内置且已测试的字段映射，并使用你在自己账户中创建的凭据，直接通过各自的 REST API 提交：Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana 和 Trello。提交不使用 MCP。崩溃工具、测试管理等其他服务仍通过你自己的 MCP 服务器连接。"],["我需要 GitHub Copilot 吗？","推荐使用 GitHub Copilot，它是最简单的设置方式。BugIt 也支持 VS Code 中的 Claude 扩展、其他助手或普通终端：提交是一条命令，因此在它们中的使用方式完全相同。"],["可以使用 Claude、Gemini 或 GPT 吗？","可以。在 GitHub Copilot 中，如果你的计划提供这些模型，就可以使用。standalone 模式支持你自己的 OpenAI 或 Anthropic 密钥。"],["Taskivator 会看到我的工作内容吗？","不会。缺陷报告、规格、术语表、截图、代码、设置和工单都不会发送给 Taskivator。只会使用许可证/更新数据。"],["会发送哪些许可证/更新数据？","在浏览器 Portal 中登录你的 BugIt 账户、一个单向哈希的设备 ID、一个随机安装标识符、你的设备名（主机名）与操作系统名称、BugIt 版本与你选择的 Solo 或 Team 套餐筛选、短时有效的加密质询材料，以及你为这台设备批准的 Solo 或 Team 权益。"],["Team 包含什么？","BugIt Team 现已推出。一次性付款即可获得适用于最多 5 名成员的 1 年期许可证：每位成员都拥有各自的 BugIt 账户、各自的登录和各自的设备激活，而不是共享一个许可证。团队配置为共享，并在门户中集中管理，且不自动续订。Solo 套餐不受影响，同样可用。"],["可以不提交就练习吗？","可以。使用 dry run 可以生成完整报告，而不会创建工单、评论、附件或通知。 dry run 会阻止 BugIt 内置的辅助工具写入，并指示代理拒绝对跟踪器的写入；这种拒绝遵循的是 BugIt 的指令而非平台级锁定，因此评估时请使用只读凭据。"],["哪些文件可以安全编辑？","可以安全编辑 config.json、.vscode/mcp.json、.github/glossary/terms.template.md、.github/instructions/learned.instructions.md，以及你自己创建的 .github/instructions/house-style.instructions.md。"],["哪些内容不应手动编辑？","不要手动编辑 .github/agents/bugit-qa-agent.agent.md、.github/instructions/ 下随产品提供的其他文件，或 tools/ 中的任何文件。更新会覆盖这些产品文件，而且不会备份。"],["更新如何工作？","BugIt 会备份你拥有的设置文件，验证已签名的更新，就地安装，并保留配置、术语表、团队风格、许可证和连接。"],["许可证到期后会怎样？","许可证期限结束后有 3 天宽限期，此后提交和激活功能需要有效的许可证。你的本地文件和设置仍归你所有。许可证服务器故障是另一种情况：缓存验证允许最多 72 小时离线继续工作。"],["续订会叠加吗？","不会。续订会替换当前的激活，并从该日期开始新的期限。请在当前期限接近结束时续订。"],["如何获得支持？","先让 AI 助手诊断问题，然后运行 Check status 或 Check readiness。如果仍需帮助，请从 BugIt 控制台提交支持工单，无需包含机密项目信息。"]]},"docs":{"eyebrow":"文档","getting":"快速开始","gettingDesc":"几分钟内完成 BugIt 设置。","user":"用户指南","userDesc":"功能与工作流的完整指南。","license":"许可协议","licenseDesc":"阅读 BugIt 的使用条款。","privacy":"隐私政策","privacyDesc":"我们如何收集、使用和保护你的数据。","faqDesc":"常见问题解答。","support":"支持","supportDesc":"获取帮助并提交支持工单。","commerce":"商业交易信息","commerceDesc":"卖方与交易信息（特定商取引法に基づく表記）。","refund":"退款政策","refundDesc":"我们的 7 天退款政策。"},"docPages":{"homeTitle":"文档","homeIntro":"安装、激活、自定义并安全使用 BugIt 所需的一切。已更新至 BugIt QA Agent。","gettingTitle":"快速开始","userTitle":"用户指南","licenseTitle":"许可协议","privacyTitle":"隐私政策","faqTitle":"FAQ","supportTitle":"支持","supportIntro":"遇到设置问题时，先让 BugIt 助手诊断问题，然后运行 Check status 或 Check readiness。如果仍需要帮助，请从 BugIt 控制台提交支持工单。","download":"下载 PDF","before":"提交支持工单前","beforeText":"不要包含机密源代码、客户数据、私有工单、截图、令牌或密钥。请用一般方式描述 BugIt 问题。","sections":["安装 VS Code 和 GitHub Copilot，解压 BugIt，打开 BugIt 文件夹，在 Copilot Chat 中选择 BugIt QA Agent，激活许可证，首次接受条款，然后输入 Begin setup。BugIt 会用自然语言提问，为你写入 config.json，帮助连接你的跟踪系统，并通过 Check readiness 确认准备就绪。","日常使用以聊天为主：Write a bug report、Quick bug、Write a crash bug report、Translate、Close #ID、Check status、Check readiness、Back up my settings、Restore my settings 和 Update。使用 dry run 可以生成完整报告，而不会创建工单、评论、附件或通知。可安全自定义的文件包括 config.json、.vscode/mcp.json、.github/glossary/terms.template.md、.github/instructions/learned.instructions.md，以及你自己创建的 .github/instructions/house-style.instructions.md。不要手动编辑核心 agent、随产品提供的 instruction 文件或 tools 文件夹；更新会覆盖它们，且不会备份。","BugIt 是许可使用，不是出售。Solo 同时允许 1 台设备。Team 最多允许 5 名成员，每人拥有各自的账户和设备。账户及其使用权不得共享、公开、转售、再许可或转让。您可以自定义配置、术语表、模板和自己的 instruction 文件，但不得绕过许可证、激活、席位限制或更新验证。BugIt 是一次性购买，不会自动续订：自首次激活起授予一年期许可证，到期后有 3 天宽限期。本协议受日本法律管辖。相关请求可向日本法院提起；如果您是消费者，这不影响您在居住国法院提起诉讼的权利。","Taskivator 只接收许可证/更新数据：在浏览器 Portal 中登录您的 BugIt 账户、一个单向哈希的设备 ID、一个随机安装标识符、您的设备名（主机名）与操作系统名称、BugIt 版本与您选择的 Solo 或 Team 套餐筛选、短时有效的加密质询材料，以及您为这台设备批准的 Solo 或 Team 权益。BugIt 软件不使用 Google Ads 衡量，也不发送产品遥测数据。（本网站本身为提升性能使用 Cloudflare Web Analytics。）报告、规格、术语表、house style、学习修正、本地文件和令牌都保留在您的设备上。报告文本只会发送到您选择并连接的 AI 模型和 tracker。"],"commerceTitle":"商业交易信息","commerceIntro":"BugIt 的卖方与交易信息，包括依据日本《特定商取引法》就邮购销售提供的信息。","refundTitle":"退款政策","refundIntro":"BugIt 许可证购买的退款政策。"}});
add("ru", {"name":"Русский","nav":{"features":"Функции","integrations":"Интеграции","pricing":"Цены","docs":"Документация","faq":"FAQ"},"cta":{"early":"Получить BugIt","demo":"Смотреть демо","signin":"Войти"},"hero":{"title":"QA-агент, который <span>изучает</span> ваш рабочий процесс.","subtitle":"Превращает черновые тестовые заметки в аккуратные проверенные баг-тикеты и за секунды отправляет их в Jira, Azure DevOps или ваш трекер."},"metrics":{"saved":"на отправку","dupe":"проверка дубликатов","setup":"настройка","private":"по умолчанию","savedNum":"Секунды","dupeNum":"Авто","setupNum":"Пошаговая","privateNum":"Приватно"},"under":{"features":"✓ Все функции включены","updates":"✓ Бесплатные обновления программы","private":"✓ Приватность по умолчанию"},"demo":{"eyebrow":"СМОТРИТЕ В ДЕЙСТВИИ","title":"Один агент. Разные миры QA.","subtitle":"Используйте его для веба, мобильных и десктопных приложений, SaaS, корпоративных рабочих процессов или игр.","core":"Основной сценарий","saas":"SaaS / веб-приложение","game":"QA для игр","mobile":"Мобильное приложение"},"integrations":{"eyebrow":"РАБОТАЕТ С ВАШИМИ ИНСТРУМЕНТАМИ","title":"Подключите инструменты, которыми уже пользуетесь.","lede":"Все одиннадцать трекеров имеют встроенное проверенное сопоставление полей, и BugIt пишет в каждый из них учётными данными, которые вы создаёте в собственном аккаунте: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana и Trello. BugIt проверяет ваши собственные учётные данные на выбранном вами назначении, прежде чем сохранить подключение. Инструменты для сбоев, управление тестами и прочие сервисы подключаются через ваш MCP-сервер, чтобы ассистент мог их читать.","builtin":"ВСТРОЕННОЕ ПРОВЕРЕННОЕ СОПОСТАВЛЕНИЕ","mcp":"ЧЕРЕЗ ВАШ MCP-СЕРВЕР","crash":"СБОИ И ТЕСТЫ","knowledge":"ЗНАНИЯ И СОВМЕСТНАЯ РАБОТА","note":"⌁ Включите поддерживаемый инструмент в настройке. Подключите один раз и используйте везде. Хранилища вроде Amazon S3 и Google Drive не настраиваются автоматически."},"pricing":{"soloTitle":"ЛИЧНАЯ ЛИЦЕНЗИЯ","teamTitle":"КОМАНДНАЯ ЛИЦЕНЗИЯ","seats":"","perYear":" разовый платёж","soloTerm":"Лицензия Solo на 1 год · без автопродления","teamTerm":"Лицензия Team на 1 год · без автопродления","limited":"Стартовая цена","soloRegular":"Обычная цена $59.99","teamRegular":"Обычная цена $249.99","soloDevice":"1 устройство (1 пользователь)","allFeatures":"Все функции включены","updates":"Бесплатные обновления программы при активной лицензии","docs":"Документация и руководства","support":"Поддержка по email","teamDevices":"До 5 участников, у каждого свой аккаунт","teamWorkflow":"Общий QA-процесс","teamConfig":"Общая конфигурация проекта","teamSeverity":"Единые уровни важности и категории","teamTools":"Инструменты настройки команды","priority":"Приоритетная поддержка","teamCta":"Получить BugIt Team","soloCta":"Получить BugIt Solo"},"trust":{"privateTitle":"Приватность по умолчанию","private":"Ваша работа отправляется только в подключённые вами ИИ и трекер, но никогда в Taskivator. Мы никогда не храним ваши данные, не обучаем на них модели и не продаём их.","telemetryTitle":"Без телеметрии агента","telemetry":"Программное обеспечение BugIt не отправляет телеметрию продукта. Этот сайт использует Cloudflare Web Analytics для оценки производительности.","previewTitle":"Предпросмотр перед отправкой","preview":"Вы просматриваете каждый тикет и подтверждаете каждую отправку вводом FILE IT.","backupsTitle":"Локальные резервные копии","backups":"Ваши настройки и активность остаются на вашем компьютере. Удобное резервное копирование в любой момент.","updatesTitle":"Безопасные обновления","updates":"Обновления криптографически подписаны и проверяются перед установкой.","vscodeTitle":"Работает там, где вы уже работаете","vscode":"Отдельное приложение устанавливать не нужно. Создание тикета выполняется командой, поэтому всё работает одинаково в VS Code с Copilot Chat, с расширением Claude и в обычном терминале. Также понадобятся ИИ-ассистент и Python."},"faq":{"title":"Детали запуска без сюрпризов.","items":[["BugIt создаёт баги автоматически?","Нет. Каждый тикет, комментарий, вложение и уведомление сначала показывается для предпросмотра. Перед необратимым созданием тикета вы подтверждаете его вводом FILE IT; один только текст в чате никогда ничего не создаёт. Обычного «да» недостаточно. Используйте dry run, чтобы тренироваться без записи."],["У каких трекеров есть встроенное проверенное сопоставление?","Встроенное проверенное сопоставление полей есть у всех одиннадцати, и тикеты создаются напрямую через собственный REST API каждого трекера с учётными данными, которые вы создаёте в своём аккаунте: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana и Trello. MCP для этого не используется. Инструменты для сбоев, управление тестами и прочие сервисы по-прежнему подключаются через ваш собственный MCP-сервер."],["Нужен ли GitHub Copilot?","GitHub Copilot рекомендуется и является самым простым вариантом. BugIt также работает с расширением Claude в VS Code, с другим ассистентом или в обычном терминале: создание тикета выполняется командой, поэтому везде работает одинаково."],["Можно ли использовать Claude, Gemini или GPT?","Да, внутри GitHub Copilot, если эти модели доступны в вашем плане. Автономный режим поддерживает ваш ключ OpenAI или Anthropic."],["Видит ли Taskivator мою работу?","Нет. Баг-отчёты, спецификации, глоссарий, скриншоты, код, настройки и тикеты не отправляются в Taskivator. Используются только данные лицензии и обновлений."],["Какие данные лицензии и обновлений отправляются?","Вход в вашу учётную запись BugIt (в браузере, на Portal), односторонний хешированный идентификатор устройства, случайный идентификатор установки, имя вашего устройства (hostname) и название операционной системы, версию BugIt и выбранный вами фильтр плана Solo или Team, недолговечный криптографический материал запроса-ответа, а также право Solo или Team, которое вы подтверждаете для этого устройства."],["Что входит в Team?","Тариф Team уже доступен. Разовый платёж включает лицензию на 1 год для команды до 5 участников, у каждого участника собственный аккаунт BugIt, собственный вход и собственная активация устройства вместо общей лицензии. Конфигурация команды общая и управляется централизованно в Портале, без автопродления. Тариф Solo не затронут и также доступен."],["Можно ли тренироваться без создания тикетов?","Да. Используйте dry run, чтобы создать полный отчёт без тикетов, комментариев, вложений или уведомлений. Dry run не даёт встроенным помощникам BugIt выполнять запись и указывает агенту отклонять запись в трекер; этот отказ следует инструкциям BugIt, а не блокировке платформы, поэтому при проверке используйте учётные данные только для чтения."],["Какие файлы можно безопасно редактировать?","Безопасно редактировать config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md и .github/instructions/house-style.instructions.md, если вы его создадите."],["Что нельзя редактировать вручную?","Не редактируйте вручную .github/agents/bugit-qa-agent.agent.md, другие поставляемые файлы в .github/instructions/ и любые файлы в tools/. Обновления перезаписывают эти файлы продукта, и они не входят в резервную копию."],["Как работают обновления?","BugIt создаёт резервную копию ваших настроек, проверяет подписанные обновления, устанавливает их на месте и сохраняет config, глоссарий, house style, лицензию и подключения."],["Что произойдёт после истечения лицензии?","BugIt приобретается один раз и не продлевается автоматически. Годовая лицензия включает обновления и сервисы лицензирования. После окончания срока действует трёхдневный льготный период. Затем для создания тикетов и активации нужна действующая лицензия, однако локальные файлы и настройки остаются вашими. Чтобы продолжить работу, можно купить новую лицензию; автоматических списаний нет. Сбои сервера лицензирования обрабатываются отдельно: кэшированная проверка позволяет работать офлайн до 72 часов."],["Суммируются ли продления?","Нет. Продление заменяет вашу текущую активацию и запускает новый срок с этой даты, поэтому продлевайте ближе к концу текущего срока."],["Как получить поддержку?","Сначала попросите AI-ассистента диагностировать проблему, затем выполните Check status или Check readiness. Если решить не удалось, создайте обращение в поддержку в личном кабинете BugIt. Конфиденциальные данные проекта указывать не нужно."]]},"docs":{"eyebrow":"ДОКУМЕНТАЦИЯ","getting":"Начало работы","gettingDesc":"Настройте BugIt за несколько минут.","user":"Руководство пользователя","userDesc":"Полное руководство по функциям и процессам.","license":"Лицензионное соглашение","licenseDesc":"Условия использования BugIt.","privacy":"Политика конфиденциальности","privacyDesc":"Как мы собираем, используем и защищаем ваши данные.","faqDesc":"Ответы на частые вопросы.","support":"Поддержка","supportDesc":"Получите помощь и создайте обращение в поддержку.","commerce":"Коммерческие условия","commerceDesc":"Сведения о продавце и сделке (特定商取引法に基づく表記).","refund":"Политика возврата","refundDesc":"Наша политика возврата в течение 7 дней."},"docPages":{"homeTitle":"Документация","homeIntro":"Документация обновлена для BugIt QA Agent: установка, активация, настройка и безопасное использование.","gettingTitle":"Начало работы","userTitle":"Руководство пользователя","licenseTitle":"Лицензионное соглашение","privacyTitle":"Политика конфиденциальности","faqTitle":"FAQ","supportTitle":"Поддержка","supportIntro":"При проблемах с настройкой сначала попросите ассистента BugIt диагностировать проблему, затем выполните Check status или Check readiness. Если помощь всё ещё нужна, создайте обращение в поддержку в личном кабинете BugIt.","download":"Скачать PDF","before":"Перед созданием обращения в поддержку","beforeText":"Не включайте конфиденциальный исходный код, данные клиентов, приватные тикеты, скриншоты, токены или секреты. Опишите проблему BugIt в общих чертах.","sections":["Установите VS Code и GitHub Copilot, распакуйте BugIt, откройте папку, выберите BugIt QA Agent в Copilot Chat, активируйте лицензию, один раз примите условия и введите Begin setup. BugIt задаст простые вопросы, запишет config.json, поможет подключить трекер, а Check readiness подтвердит готовность.","Повседневная работа идёт через чат: Write a bug report, Quick bug, Write a crash bug report, Translate, Close #ID, Check status, Check readiness, Back up my settings, Restore my settings и Update. dry run создаёт полный отчёт без тикетов, комментариев, вложений или уведомлений. Безопасно настраивать config.json, .vscode/mcp.json, .github/glossary/terms.template.md, .github/instructions/learned.instructions.md и .github/instructions/house-style.instructions.md, если вы его создадите. Не редактируйте вручную основной agent, поставляемые instruction-файлы или папку tools; обновления их перезаписывают, и они не входят в резервные копии.","BugIt лицензируется, а не продаётся. Solo разрешает 1 устройство одновременно. Team допускает до 5 участников, каждый со своей учётной записью и устройством. Учётной записью и связанным с ней правом использования нельзя делиться, их нельзя публиковать, перепродавать, сублицензировать или передавать другим лицам. Можно настраивать конфигурацию, глоссарий, шаблоны и собственные instruction-файлы, но нельзя обходить лицензию, активацию, ограничения мест или проверку обновлений. BugIt является разовой покупкой без автопродления: она предоставляет лицензию на один год с первой активации, с льготным периодом 3 дня после истечения. Настоящий договор регулируется законодательством Японии. Требования могут предъявляться в судах Японии; если вы потребитель, это не затрагивает ваше право обращаться в суды страны вашего проживания.","Taskivator получает только данные лицензии/обновлений: вход в вашу учётную запись BugIt (в браузере, на Portal), односторонний хешированный идентификатор устройства, случайный идентификатор установки, имя вашего устройства (hostname) и название операционной системы, версию BugIt и выбранный вами фильтр плана Solo или Team, недолговечный криптографический материал запроса-ответа, а также право Solo или Team, которое вы подтверждаете для этого устройства. Программное обеспечение BugIt не использует измерение Google Ads и не отправляет телеметрию продукта. (Сам этот сайт использует Cloudflare Web Analytics для оценки производительности.) Отчеты, спецификации, глоссарий, стиль, выученные исправления, локальные файлы и токены остаются на вашем устройстве. Текст отчета отправляется только выбранной вами AI-модели и подключенному трекеру."],"commerceTitle":"Коммерческие условия","commerceIntro":"Сведения о продавце и сделке для BugIt, включая информацию для дистанционной торговли в Японии согласно Закону об определённых коммерческих сделках (特定商取引法).","refundTitle":"Политика возврата","refundIntro":"Наша политика возврата для покупки лицензий BugIt."}});
add("ar", {"name":"العربية","nav":{"features":"المزايا","integrations":"التكاملات","pricing":"الأسعار","docs":"التوثيق","faq":"الأسئلة الشائعة"},"cta":{"early":"احصل على BugIt","demo":"شاهد العرض التوضيحي","signin":"تسجيل الدخول"},"hero":{"badge":"وكيل ضمان الجودة BugIt","title":"مهندس ضمان الجودة بالذكاء الاصطناعي الذي <span>يتعلّم مشروعك.</span>","subtitle":"يتعلّم BugIt مشروعك: مصطلحاته وقواعد درجات الخطورة والتذاكر السابقة. ثم يحوّل الملاحظات الأولية إلى تقارير مراجَعة ومفحوصة بحثًا عن المكرّرات وآمنة من حيث الخصوصية، جاهزة لنظام التتبع الخاص بك."},"metrics":{"savedNum":"جاهز في ثوانٍ","saved":"من ملاحظات أولية إلى تقرير مسجَّل","dupeNum":"يفهم مشروعك","dupe":"المصطلحات، درجات الخطورة، التذاكر السابقة","setupNum":"يكتشف المكرّرات","setup":"يُشير إلى المشكلات ذات الصلة قبل التسجيل","privateNum":"خصوصية بالتصميم","private":"لا قياس عن بُعد. بياناتك تبقى ملكك."},"under":{"features":"✓ بدون اشتراك شهري","approval":"✓ موافقة بشرية قبل التسجيل","updates":"✓ تحديثات البرنامج مجانية","private":"✓ سياسة استرداد خلال 7 أيام"},"mission":{"produces":"كتب BugIt التقرير أدناه","window":"BugIt مركز التحكم","head":"تعلّم المشروع","profile":"تم تعلّم مصطلحات المشروع","workflow":"تم استيراد سير عمل ضمان الجودة","glossary":"تم تحميل قواعد درجات الخطورة","severity":"تم تصنيف المكوّن والبيئة","duplicate":"اكتمل تحليل المكرّرات","redaction":"اكتمل فحص الخصوصية","format":"التنسيق لنظام التتبع جاهز","ready":"في انتظار موافقتك","phases":["قراءة المشروع", "استيراد سير العمل", "تحميل درجات الخطورة", "التصنيف", "البحث عن المكرّرات", "فحص الخصوصية", "التنسيق"],"acts":["قراءة قاموس مصطلحات المشروع","استيراد سير عمل ضمان الجودة","تحميل قواعد درجات الخطورة","تصنيف المكوّن والبيئة","البحث في فهرس المكرّرات","فحص البيانات الحساسة","تنسيق التقرير"],"resGloss":"تم تحميل {n} من المصطلحات","resWorkflow":"تم استيراد سير عمل ضمان الجودة","resSeverity":"تم اكتشاف مصفوفة درجات الخطورة","resClass":"{comp} في {env}","resPrivacy":"نجح فحص الخصوصية","resFormat":"اكتمل التنسيق لنظام التتبع","initializing":"جارٍ تهيئة المشروع","complete":"اكتمل","readyStream":"جاهز، في انتظار موافقتك"},"report":{"showFull":"عرض التقرير الكامل","hideFull":"إخفاء التقرير الكامل","label":"تحليل الذكاء الاصطناعي لضمان الجودة","title":"يُعطَّل زر تسجيل الدخول نهائيًا بعد محاولات سريعة متتالية","metaSevL":"درجة الخطورة","metaSevV":"عالية","metaCompL":"المكوّن","metaCompV":"المصادقة","metaEnvL":"البيئة","metaEnvV":"الإنتاج","metaDupL":"المكرّرات","metaDupV":"1 ذات صلة، لا مطابقة تامة","metaDupRes":"عُثر على مشكلة واحدة ذات صلة، لا مطابقة تامة","summaryTitle":"الملخص","summary":"النقر المتكرر على زر تسجيل الدخول أثناء عملية المصادقة يؤدي إلى تعطيل الزر دون عرض أي رسالة خطأ، ما يترك المستخدم عالقًا في شاشة تسجيل الدخول.","analysisTitle":"تحليل الذكاء الاصطناعي","analysis":"تمت إعادة الإنتاج من السجل المرفق: تكرار استجابة 401 عند تجديد الرمز المميز يُبقي الزر معطّلًا دون إظهار أي خطأ للمستخدم. صُنِّف ضمن المصادقة وقُيِّم بدرجة خطورة عالية وفق مصفوفة المشروع، لأن عملية تسجيل الدخول محظورة على المستخدمين الفعليين. توجد تذكرة واحدة ذات صلة لكن لا يوجد مكرّر تام.","pre":"خطوات إعادة الإنتاج\n1. افتح صفحة تسجيل الدخول وأدخل بيانات اعتماد صالحة\n2. انقر على \"تسجيل الدخول\" عدة مرات بسرعة\n\nالمتوقع   تسجيل دخول مرة واحدة.\nالفعلي     يُقفل الزر؛ يفشل تسجيل الدخول بصمت.\n\nمن السجل   تكرار 401 على /session/refresh بعد انتهاء صلاحية الرمز المميز.","checkedTitle":"فُحص تلقائيًا","chkSeverity":"درجة الخطورة","chkComponent":"المكوّن","chkEnv":"البيئة","chkDupe":"البحث عن المكرّرات","chkPii":"فحص البيانات الشخصية","chkFormat":"التنسيق لنظام التتبع","privacyLabel":"الخصوصية","privacyVal":"نجح","qualityLabel":"الجودة","qualityVal":"تقييم A","submitLabel":"الإيداع","submitVal":"موافقة يدوية","exportLabel":"التصدير","exportVal":"Jira · ADO · GitHub","scenB":{"title":"عند الدفع للاشتراك السنوي يُحتسب السعر الشهري","sev":"عالية","comp":"الفوترة","env":"الإنتاج","dup":"لا مكرّر تام","dupRes":"لم يُعثر على مشكلات ذات صلة","summary":"اختيار الخطة السنوية عند الدفع يُطبّق سعر الخطة الشهرية، ما يجعل إجمالي الفاتورة خاطئًا ويُسبّب تقاضي مبلغ أقل من المستحق.","analysis":"أُعيد الإنتاج من تسجيل الشاشة: مفتاح التبديل السنوي يُحدّث التسمية المرئية لكنه لا يُحدّث المبلغ المرسَل إلى واجهة الدفع البرمجية. صُنِّف ضمن الفوترة وقُيِّم بدرجة عالية في مصفوفة خطورة المشروع، لأنه يؤثر على الرسوم الفعلية. لم يُعثر على مكرّر تام في نظام التتبع.","pre":"خطوات إعادة الإنتاج\n1. افتح صفحة الأسعار وبدّل الخطة إلى السنوية\n2. أكمل عملية الدفع ببطاقة اختبار\n\nالمتوقع   الفاتورة تعرض الإجمالي السنوي.\nالفعلي     الفاتورة تعرض السعر الشهري.\n\nمن السجل   checkout.amount أُرسل كـ monthlyPrice."},"scenC":{"title":"لقطات الشاشة المرفقة كأدلة تظهر مقلوبة في معاينة التقرير","sev":"متوسطة","comp":"المرفقات","env":"بيئة الاختبار المسبق","dup":"2 ذاتا صلة، لا مطابقة تامة","dupRes":"عُثر على مشكلتين ذاتَيْ صلة، لا مطابقة تامة","summary":"لقطات الشاشة العمودية المرفقة بتقرير تظهر بشكل أفقي في المعاينة، مما يُصعّب قراءة المنطقة المحدّدة قبل التسجيل.","analysis":"أُعيد الإنتاج من الصورة المرفقة: يُفقد اتجاه EXIF عند إنشاء الصورة المصغّرة للمعاينة. صُنِّف ضمن المرفقات وقُيِّم بدرجة متوسطة لأن الملف الأصلي يُحفظ سليمًا. توجد تذكرتان ذات صلة لكن لا مكرّر تام.","pre":"خطوات إعادة الإنتاج\n1. ابدأ تقريرًا وأرفق لقطة شاشة عمودية\n2. افتح معاينة التقرير\n\nالمتوقع   الصورة تظهر بالاتجاه الصحيح.\nالفعلي     الصورة مقلوبة 90 درجة.\n\nمن السجل   أُنشئت الصورة المصغّرة بدون معلومات اتجاه EXIF."},"progress":"اكتمل · 100%"},"demo":{"eyebrow":"شاهده يعمل","title":"وكيل واحد. عوالم ضمان جودة متعددة.","subtitle":"استخدمه لتطبيقات الويب والهواتف وسطح المكتب وSaaS وسير العمل المؤسسي والألعاب.","core":"سير العمل الأساسي","saas":"SaaS / تطبيقات الويب","game":"ضمان جودة الألعاب","mobile":"تطبيق الجوال"},"trust":{"backupsTitle":"نسخ احتياطية محلية","backups":"تبقى إعداداتك ونشاطك على جهازك. ويمكنك إنشاء نسخة احتياطية بسهولة في أي وقت.","updatesTitle":"تحديثات آمنة","updates":"التحديثات موقَّعة تشفيريًا ويجري التحقق منها قبل التثبيت.","privateTitle":"خصوصية بالتصميم","private":"عملك يُرسَل فقط إلى الذكاء الاصطناعي ونظام التتبع اللذين تربطهما بنفسك، ولا يُرسَل أبدًا إلى Taskivator. لا نخزّن بياناتك ولا ندرّب عليها ولا نبيعها.","telemetryTitle":"لا قياس عن بُعد من الوكيل","telemetry":"برنامج BugIt لا يُرسل أي بيانات قياس عن بُعد. يستخدم هذا الموقع Cloudflare Web Analytics لقياس الأداء فقط.","previewTitle":"معاينة قبل التسجيل","preview":"تراجع كل تذكرة وتوافق على كل عملية تسجيل بكتابة FILE IT.","backupTitle":"نسخ احتياطية محلية","backup":"إعداداتك ونشاطك يبقيان على جهازك. نسخ احتياطية سهلة في أي وقت.","secureTitle":"تحديثات آمنة","secure":"التحديثات موقّعة رقميًا ويتم التحقق منها قبل التثبيت.","vscodeTitle":"يعمل في VS Code","vscode":"مدمج في VS Code، فلا حاجة لتطبيق منفصل. ستحتاج أيضًا إلى Copilot (أو مفتاح ذكاء اصطناعي خاص بك) وPython."},"integrations":{"eyebrow":"يعمل مع أدواتك","title":"اربط ما تستخدمه بالفعل.","lede":"تتضمّن أنظمة التتبع الأحد عشر جميعها تعييناً مُختبراً للحقول مدمجاً، ويسجّل BugIt في كلٍّ منها ببيانات اعتماد تنشئها في حسابك الخاص: Jira Cloud وAzure DevOps وGitHub Issues وGitLab Issues وBugzilla وYouTrack وLinear وShortcut وClickUp وAsana وTrello. وقد جرى اعتماد كلٍّ منها مقابل حساب حقيقي. أما أدوات التعطل وإدارة الاختبارات وسائر الخدمات فتتصل عبر خادم MCP الخاص بك ليقرأ منها مساعدك.","builtin":"ربط حقول مدمج ومُختبَر","mcp":"عبر خادم MCP الخاص بك","crash":"الأعطال والاختبار","knowledge":"المعرفة والتعاون","note":"⌁ فعّل أداة مدعومة أثناء الإعداد. اربطها مرة واحدة واستخدمها في كل مكان. خدمات التخزين مثل Amazon S3 وGoogle Drive لا تُهيَّأ تلقائيًا."},"pricing":{"limitedTag":"محدود","soloTitle":"ترخيص فردي","teamTitle":"ترخيص فريق","seats":"","perYear":" دفعة واحدة","soloTerm":"ترخيص فردي لمدة سنة · لا يُجدَّد تلقائيًا","teamTerm":"ترخيص فريق لمدة سنة · لا يُجدَّد تلقائيًا","limited":"سعر تمهيدي","soloRegular":"السعر العادي $59.99","teamRegular":"السعر العادي $249.99","refundNote":"مدعوم بسياسة استرداد خلال 7 أيام.","refundLink":"اقرأ سياسة الاسترداد","soloDevice":"جهاز واحد (مستخدم واحد)","allFeatures":"جميع المزايا مشمولة","updates":"تحديثات البرنامج مجانية أثناء فترة الترخيص","docs":"التوثيق والأدلة","support":"دعم عبر البريد الإلكتروني","teamDevices":"حتى 5 أعضاء، لكل منهم حسابه الخاص","teamWorkflow":"سير عمل ضمان جودة مشترك","teamConfig":"إعدادات مشروع مشتركة","teamSeverity":"درجات خطورة وتصنيفات موحّدة","teamTools":"أدوات إعداد الفريق","priority":"دعم ذو أولوية","teamCta":"احصل على BugIt Team","soloCta":"احصل على BugIt Solo"},"faq":{"title":"تفاصيل الإطلاق، بدون مفاجآت.","items":[["هل يُسجّل BugIt الأخطاء تلقائيًا؟","لا. كل تذكرة أو تعليق أو مرفق أو إشعار يُعرض للمعاينة أولًا. قبل أي تسجيل لا رجعة فيه، تُوافق عليه بكتابة FILE IT؛ نص المحادثة وحده لا يُسجّل شيئًا. كلمة \"نعم\" لا تكفي. استخدم dry run للتدريب دون كتابة."],["أي أنظمة تتبع تملك ربط حقول مدمج ومُختبَر؟","تتضمّن أنظمة التتبع الأحد عشر جميعها تعييناً مُختبراً للحقول مدمجاً، ويسجّل BugIt في كلٍّ منها ببيانات اعتماد تنشئها في حسابك الخاص: Jira Cloud وAzure DevOps وGitHub Issues وGitLab Issues وBugzilla وYouTrack وLinear وShortcut وClickUp وAsana وTrello. وقد جرى اعتماد كلٍّ منها مقابل حساب حقيقي. أما أدوات التعطل وإدارة الاختبارات وسائر الخدمات فتتصل عبر خادم MCP الخاص بك ليقرأ منها مساعدك."],["هل أحتاج إلى GitHub Copilot؟","GitHub Copilot هو الأسهل والموصى به. يعمل BugIt أيضًا مع امتداد Claude في VS Code أو مساعد آخر أو طرفية عادية. الإيداع يتم بأمر في الطرفية، فيعمل بالطريقة نفسها في جميعها."],["هل يمكنني استخدام Claude أو Gemini أو GPT؟","نعم. داخل GitHub Copilot، استخدم النماذج المتاحة لخطة Copilot الخاصة بك. الوضع المستقل يدعم مفتاح OpenAI أو Anthropic الخاص بك."],["هل ترى Taskivator عملي؟","لا. تقارير العيوب والمواصفات وقاموس المصطلحات ولقطات الشاشة والشفرة والإعدادات والتذاكر لا تُرسَل إلى Taskivator. لا تُستخدم إلا بيانات الترخيص والتحديث."],["ما بيانات الترخيص والتحديث التي تُرسَل؟","تُرسَل بيانات تسجيل دخولك إلى حساب BugIt عبر البوابة، ومعرّف جهاز مجهول الهوية مُنشأ بتجزئة أحادية الاتجاه، ومعرّف تثبيت عشوائي، واسم الجهاز (اسم المضيف) واسم نظام التشغيل، وإصدار BugIt وخطة Solo أو Team التي تختارها، ومادة تحدٍّ تشفيرية قصيرة العمر، واستحقاق Solo أو Team الذي توافق عليه لهذا الجهاز."],["ماذا يشمل ترخيص الفريق؟","BugIt Team متوفر الآن. دفعة واحدة تغطي ترخيصًا لمدة سنة لما يصل إلى 5 أعضاء، لكل عضو حسابه الخاص وتسجيل دخوله الخاص وتفعيل جهازه الخاص، بدلًا من ترخيص مشترك. يُدار إعداد الفريق مركزيًا في البوابة، ولا يُجدَّد تلقائيًا. الترخيص الفردي لم يتأثر ومتوفر أيضًا."],["هل يمكنني التدرّب دون تسجيل فعلي؟","نعم. استخدم dry run لتوليد تقرير كامل دون إنشاء تذاكر أو تعليقات أو مرفقات أو إشعارات. يُوقف dry run المساعدات المدمجة في BugIt عن الكتابة ويُوجّه الوكيل لرفض عمليات الكتابة في نظام التتبع؛ هذا الرفض يتبع تعليمات BugIt وليس قفلًا على مستوى المنصة، لذا استخدم بيانات اعتماد للقراءة فقط عند التقييم."],["ما الملفات التي يمكنني تعديلها بأمان؟","تشمل الملفات المملوكة للمشتري التي يمكن تعديلها بأمان config.json و.vscode/mcp.json و.github/glossary/terms.template.md و.github/instructions/learned.instructions.md و.github/instructions/house-style.instructions.md إذا أنشأته."],["ما الملفات التي ينبغي ألا أعدّلها يدويًا؟","لا تعدّل .github/agents/bugit-qa-agent.agent.md يدويًا، ولا الملفات الأخرى المرفقة بالمنتج تحت .github/instructions/، ولا أي ملف داخل tools/. تستبدل التحديثات ملفات المنتج هذه، ولا تشملها النسخ الاحتياطية."],["كيف تعمل التحديثات؟","ينسخ BugIt إعداداتك المملوكة لك احتياطيًا، ويتحقق من التحديثات الموقّعة، ويثبّتها في مكانها، ويحافظ على الإعداد وقاموس المصطلحات وأسلوب الكتابة والترخيص والاتصالات."],["ماذا يحدث عند انتهاء الترخيص؟","BugIt هو شراء لمرة واحدة ولا يُجدَّد تلقائيًا. ترخيصك لمدة سنة يشمل التحديثات وخدمات الترخيص والتفعيل. تسري فترة سماح لمدة 3 أيام بعد انتهاء الترخيص؛ وبعدها تحتاج ميزات الإيداع والتفعيل إلى ترخيص ساري المفعول، بينما تبقى ملفاتك وإعداداتك المحلية ملكك. يمكنك شراء ترخيص جديد للاستمرار. لا توجد أي رسوم تلقائية. انقطاعات خادم الترخيص حالة منفصلة: أثناء سريان الترخيص، يتيح لك التحقق المخزّن مؤقتًا مواصلة العمل دون اتصال لمدة تصل إلى 72 ساعة."],["إذا اشتريت BugIt مرة أخرى، فهل تُضاف المدة؟","لا. يحل الشراء الجديد محل تفعيلك الحالي ويبدأ ترخيصًا جديدًا لمدة سنة من ذلك التاريخ، لذا اشترِ مجددًا قرب نهاية ترخيصك الحالي. لا تتجدد المشتريات تلقائيًا أبدًا."],["كيف أحصل على الدعم؟","اطلب أولًا من مساعد الذكاء الاصطناعي تشخيص المشكلة، ثم نفّذ Check status أو Check readiness. إذا لم تُحل المشكلة، افتح تذكرة دعم من لوحة التحكم الخاصة بك. لا حاجة لتضمين تفاصيل المشروع السرية."]]},"docs":{"eyebrow":"التوثيق","getting":"البدء","gettingDesc":"أعدّ BugIt في دقائق.","user":"دليل المستخدم","userDesc":"الدليل الكامل للمزايا وسير العمل.","license":"اتفاقية الترخيص","licenseDesc":"اقرأ شروط استخدام BugIt.","privacy":"سياسة الخصوصية","privacyDesc":"كيف نجمع بياناتك ونستخدمها ونحميها.","refund":"سياسة الاسترداد","refundDesc":"سياسة الاسترداد خلال 7 أيام.","commerce":"المعاملات التجارية","commerceDesc":"معلومات البائع والمعاملات (特定商取引法に基づく表記).","faqDesc":"إجابات على الأسئلة الشائعة.","support":"الدعم","supportDesc":"احصل على مساعدة وافتح تذكرة دعم."},"docPages":{"homeTitle":"التوثيق","commerceTitle":"المعاملات التجارية","commerceIntro":"معلومات البائع والمعاملات لـ BugIt، بما في ذلك المعلومات المقدّمة للمبيعات عبر البريد في اليابان بموجب قانون المعاملات التجارية المحددة (特定商取引法).","homeIntro":"كل ما تحتاجه لتثبيت BugIt وتفعيله وتخصيصه واستخدامه بأمان.","refundTitle":"سياسة الاسترداد","refundIntro":"سياسة الاسترداد لمشتريات تراخيص BugIt.","gettingTitle":"البدء","userTitle":"دليل المستخدم","licenseTitle":"اتفاقية الترخيص","privacyTitle":"سياسة الخصوصية","faqTitle":"الأسئلة الشائعة","supportTitle":"الدعم","supportIntro":"لمشكلات الإعداد، اطلب أولًا من مساعد BugIt تشخيص المشكلة، ثم شغّل Check status أو Check readiness. إذا بقيت بحاجة إلى مساعدة، فافتح تذكرة دعم من لوحة تحكم BugIt.","download":"تحميل PDF","before":"قبل الإرسال","beforeText":"يُرجى عدم تضمين شفرة مصدرية سرية أو بيانات عملاء أو تذاكر خاصة أو لقطات شاشة أو رموز وصول أو أسرار. صِف مشكلة BugIt بعبارات عامة.","sections":["ثبّت VS Code وGitHub Copilot، ونزّل BugIt من لوحة تحكم حسابك وفك ضغطه، وافتح مجلد BugIt كمساحة عمل موثوقة، ثم اختر وكيل BugIt QA Agent في Copilot Chat واكتب Activate. يفتح BugIt بوابة BugIt Portal في متصفحك لتسجيل الدخول والموافقة على هذا الجهاز؛ ولا يوجد مفتاح ترخيص للنسخ أو اللصق. بعدها اكتب Begin setup: يطرح BugIt أسئلة بلغة بسيطة، ويكتب config.json نيابةً عنك، ويساعدك على ربط نظام التتبع، ويؤكد Check readiness جاهزيتك للعمل.","الاستخدام اليومي يبدأ من الدردشة: اكتب تقرير خلل، أو تقرير خلل سريع، أو تقرير خلل عن تعطل، أو ترجم، أو أغلق تذكرة، أو تحقق من الحالة، أو تحقق من الجاهزية، أو انسخ إعداداتك احتياطيًا واستعدها، أو حدّث. استخدم وضع المحاكاة dry run متى أردت تقريرًا كاملًا دون إنشاء تذاكر أو تعليقات أو مرفقات أو إشعارات. التخصيص الآمن يكون في config.json و.vscode/mcp.json و.github/glossary/terms.template.md و.github/instructions/learned.instructions.md و.github/instructions/house-style.instructions.md إذا أنشأته. لا تحرّر يدويًا ملف الوكيل الأساسي أو ملفات التعليمات المرفقة أو مجلد tools؛ فالتحديثات تستبدل ملفات المنتج هذه ولا تُنسخ احتياطيًا.","BugIt مُرخّص وليس مباعًا. يتيح Solo جهازًا واحدًا في المرة الواحدة، ويتيح Team حتى 5 أعضاء، لكل منهم حسابه وجهازه. لا يجوز مشاركة حسابك واستحقاقه أو نشرهما أو إعادة بيعهما أو ترخيصهما من الباطن أو نقلهما. يمكنك تخصيص الإعدادات والمسرد والقوالب وملفات التعليمات الخاصة بك، لكن لا يجوز تجاوز الترخيص أو التفعيل أو حدود المقاعد أو التحقق من التحديث. BugIt عملية شراء لمرة واحدة لا تُجدَّد تلقائيًا: يمنح ترخيصًا لمدة سنة من أول تفعيل، تليه فترة سماح مدتها 3 أيام بعد الانتهاء، ويخضع هذا الاتفاق لقوانين اليابان. ويجوز رفع المطالبات أمام محاكم اليابان؛ وإذا كنتم مستهلكين، فإن ذلك لا يمس حقكم في التقاضي أمام محاكم بلد إقامتكم.","لا يرسل BugIt إلى Taskivator سوى بيانات الترخيص والتحديث: تسجيل الدخول إلى حساب BugIt (في المتصفح، عبر البوابة)، ومعرّف جهاز مجهول مُجزَّأ باتجاه واحد، ومعرّف تثبيت عشوائي، واسم جهازك (اسم المضيف) واسم نظام التشغيل، وإصدار BugIt ومرشّح خطة Solo أو Team الذي تختاره، ومادة تحدٍّ تشفيرية قصيرة العمر، واستحقاق Solo أو Team الذي توافق عليه لهذا الجهاز. لا يستخدم برنامج BugIt قياس Google Ads ولا يرسل أي بيانات تتبّع للمنتج. (يستخدم هذا الموقع نفسه Cloudflare Web Analytics لقياس الأداء.) تبقى تقاريرك ومواصفاتك ومسردك وأسلوب كتابتك وتصحيحاتك المكتسبة وملفاتك المحلية ورموزك على جهازك. ولا يُرسل نص التقرير إلا إلى نموذج الذكاء الاصطناعي ونظام التتبع اللذين تختارهما وتصلهما."]},"account":{"myAccount":"حسابي","menu":"قائمة الحساب"}});

// Re-apply localized homepage meta + not-found now that all per-locale overrides
// above are in place (they run merge(i18n.en,…) and would clobber these otherwise).
applyLocalizedSiteMeta();
/* Mission Control animation + generated report: full localization for every supported language */
function addMission(c,o){if(i18n[c])i18n[c]=merge(i18n[c],o)}
addMission("ja",{"mission":{"produces":"BugItが下のレポートを作成しました","window":"BugIt ミッションコントロール","head":"プロジェクト学習","profile":"プロジェクト固有の用語を学習","workflow":"QAワークフローを取り込み","glossary":"重大度ルールを読み込み","severity":"コンポーネントと環境を分類","duplicate":"重複分析が完了","redaction":"プライバシースキャンが完了","format":"トラッカー向け整形の準備完了","ready":"承認をお待ちしています","phases":["読み込み中", "ワークフロー取得", "重大度", "分類中", "重複検索", "プライバシー", "整形中"],"acts":["プロジェクトの用語集を読み込み中","QAワークフローを取り込み中","重大度ルールを読み込み中","コンポーネントと環境を分類中","重複インデックスを検索中","機密情報をスキャン中","レポートを整形中"],"resGloss":"{n}件の用語を読み込みました","resWorkflow":"QAワークフローを取り込みました","resSeverity":"重大度マトリクスを検出しました","resClass":"{env}の{comp}","resPrivacy":"プライバシースキャンに合格しました","resFormat":"トラッカー向け整形が完了しました","initializing":"プロジェクトを初期化中","complete":"完了","readyStream":"承認の準備ができました"},"report":{"showFull":"レポート全文を表示","hideFull":"レポート全文を隠す","label":"AI QA分析","title":"サインインを短時間に連続で試行するとログインボタンが永続的に無効化される","metaSevL":"重大度","metaSevV":"高","metaCompL":"コンポーネント","metaCompV":"認証","metaEnvL":"環境","metaEnvV":"本番環境","metaDupL":"重複","metaDupV":"関連1件、完全一致なし","metaDupRes":"関連する課題が1件見つかりました。完全一致はありません","summaryTitle":"概要","summary":"サインイン中にログインを数回タップするとエラー表示のないままボタンが無効化され、ユーザーはサインイン画面から進めなくなります。","analysisTitle":"AI分析","analysis":"添付ログから再現しました。トークン更新時に401が繰り返し発生し、エラーが表示されないままボタンが無効化されます。実際のユーザーのサインインが妨げられるため、認証に分類し、プロジェクトの重大度マトリクスで「高」と判定しました。関連する課題が1件存在しますが、完全一致の重複ではありません。","pre":"再現手順\n1. サインインページを開き、有効な認証情報を入力する\n2. ログインを短時間に数回タップする\n\n期待結果   1回だけサインインされる。\n実際の結果   ボタンがロックされ、サインインがエラーなく失敗する。\n\nログより   トークン失効後、/session/refresh で401が繰り返し発生。","checkedTitle":"自動チェック済み","chkSeverity":"重大度","chkComponent":"コンポーネント","chkEnv":"環境","chkDupe":"重複検索","chkPii":"PIIスキャン","chkFormat":"トラッカー向け整形","privacyLabel":"プライバシー","privacyVal":"合格","qualityLabel":"品質","qualityVal":"評価A","submitLabel":"提出","submitVal":"手動承認","exportLabel":"エクスポート","exportVal":"Jira · ADO · GitHub","scenB":{"title":"年間プランのチェックアウトで月額料金が請求される","sev":"高","comp":"課金","env":"本番環境","dup":"完全一致の重複なし","dupRes":"関連する課題は見つかりませんでした","summary":"チェックアウトで年間プランを選択すると月額料金が適用されるため、請求額が誤り、顧客への請求が不足します。","analysis":"画面録画から再現しました。年間切り替えトグルは表示ラベルは更新するものの、決済APIに送信される金額は更新しません。実際のアカウントへの請求に影響するため、課金に分類し、プロジェクトの重大度マトリクスで「高」と判定しました。トラッカー内に完全一致の重複は見つかりませんでした。","pre":"再現手順\n1. 料金ページを開き、プランを年間に切り替える\n2. テストカードでチェックアウトを完了する\n\n期待結果   請求書に年間の合計額が表示される。\n実際の結果   請求書に月額料金が表示される。\n\nログより   checkout.amount が monthlyPrice として送信されている。"},"scenC":{"title":"証跡として添付したスクリーンショットがレポートプレビューで回転して表示される","sev":"中","comp":"添付ファイル","env":"ステージング環境","dup":"関連2件、完全一致なし","dupRes":"関連する課題が2件見つかりました。完全一致はありません","summary":"レポートに添付した縦向きのスクリーンショットがプレビューで横向きに表示され、起票前に強調箇所が読み取りにくくなります。","analysis":"添付画像から再現しました。プレビューのサムネイル生成時にEXIFの向き情報が失われています。元のファイルはそのまま保存されるため、添付ファイルに分類し、「中」と判定しました。関連する課題が2件存在しますが、完全一致の重複ではありません。","pre":"再現手順\n1. レポートを開始し、縦向きのスクリーンショットを添付する\n2. レポートプレビューを開く\n\n期待結果   画像が正しい向きで表示される。\n実際の結果   画像が90度回転して表示される。\n\nログより   サムネイルがEXIFの向き情報なしで生成されている。"},"progress":"完了 · 100%"},"hero":{"badge":"BugIt QAエージェント","title":"あなたのプロジェクトを<span>学習する</span>AI QAエンジニア","subtitle":"BugItはあなたのプロジェクト、つまり専門用語や重大度のルール、過去のチケットまで学習します。そのうえで、走り書きのメモをレビュー済み・重複チェック済み・プライバシー保護された、トラッカーにそのまま登録できるレポートへと変換します。"},"metrics":{"savedNum":"数秒で完成","saved":"走り書きのメモから登録可能なレポートへ","dupeNum":"プロジェクトを理解","dupe":"専門用語、重大度、過去のチケット","setupNum":"重複を自動検出","setup":"登録前に関連する課題を指摘","privateNum":"設計段階からプライバシー重視","private":"テレメトリ収集なし。データはお客様のものです。"},"under":{"features":"✓ 月額サブスクリプション不要","approval":"✓ 登録前に人による承認","updates":"✓ ソフトウェアのアップデートは無料","private":"✓ 7日間の返金保証"},"a11y":{"openMenu":"メニューを開く","closeMenu":"メニューを閉じる","language":"言語","siteNav":"サイトナビゲーション","home":"BugIt ホーム"},"pricing":{"limitedTag":"期間限定","refundNote":"7日間の返金保証付き。","refundLink":"返金ポリシーを読む"},"account":{"myAccount":"マイアカウント","menu":"アカウントメニュー"},"docs":{"refund":"返金ポリシー","refundDesc":"7日間の返金ポリシー。"}});
addMission("es",{"mission":{"produces":"BugIt escribió el informe de abajo","window":"BugIt Centro de Control","head":"Aprendizaje del proyecto","profile":"Terminología del proyecto aprendida","workflow":"Flujo de trabajo de QA importado","glossary":"Reglas de severidad cargadas","severity":"Componente y entorno clasificados","duplicate":"Análisis de duplicados completado","redaction":"Análisis de privacidad completado","format":"Formato para el gestor de incidencias listo","ready":"A la espera de tu aprobación","phases":["Leyendo proyecto", "Importando flujo", "Severidad", "Clasificando", "Duplicados", "Privacidad", "Aplicando formato"],"acts":["Leyendo el glosario del proyecto","Importando el flujo de trabajo de QA","Cargando las reglas de severidad","Clasificando componente y entorno","Buscando en el índice de duplicados","Analizando en busca de información sensible","Aplicando formato al informe"],"resGloss":"{n} entradas de terminología cargadas","resWorkflow":"Flujo de trabajo de QA importado","resSeverity":"Matriz de severidad detectada","resClass":"{comp} en {env}","resPrivacy":"Análisis de privacidad superado","resFormat":"Formato para el gestor de incidencias completado","initializing":"Inicializando","complete":"Completado","readyStream":"Listo para tu aprobación"},"report":{"showFull":"Ver el informe completo","hideFull":"Ocultar el informe completo","label":"Análisis de QA con IA","title":"El botón de inicio de sesión queda deshabilitado de forma permanente tras varios intentos rápidos de inicio de sesión","metaSevL":"Severidad","metaSevV":"Alta","metaCompL":"Componente","metaCompV":"Autenticación","metaEnvL":"Entorno","metaEnvV":"Producción","metaDupL":"Duplicado","metaDupV":"1 relacionada, ninguna exacta","metaDupRes":"Se encontró 1 incidencia relacionada, ninguna exacta","summaryTitle":"Resumen","summary":"Pulsar Iniciar sesión varias veces durante el inicio de sesión deshabilita el botón sin mostrar ningún error, dejando al usuario bloqueado en la pantalla de inicio de sesión.","analysisTitle":"Análisis con IA","analysis":"Reproducido a partir del registro adjunto: repetidos 401 al renovar el token dejan el botón deshabilitado sin mostrar ningún error. Clasificado como Autenticación y calificado como Alta en la matriz de severidad del proyecto, ya que el inicio de sesión queda bloqueado para usuarios reales. Existe una incidencia relacionada, pero ninguna es un duplicado exacto.","pre":"Pasos para reproducir\n1. Abre la página de inicio de sesión e introduce credenciales válidas\n2. Pulsa Iniciar sesión varias veces rápidamente\n\nEsperado   Sesión iniciada una sola vez.\nReal       El botón se bloquea; el inicio de sesión falla de forma silenciosa.\n\nEn el registro   401 repetidos en /session/refresh tras la expiración del token.","checkedTitle":"Comprobado automáticamente","chkSeverity":"Severidad","chkComponent":"Componente","chkEnv":"Entorno","chkDupe":"Búsqueda de duplicados","chkPii":"Análisis de PII","chkFormat":"Formato para el gestor de incidencias","privacyLabel":"Privacidad","privacyVal":"Superado","qualityLabel":"Calidad","qualityVal":"Calificación A","submitLabel":"Envío","submitVal":"Aprobación manual","exportLabel":"Exportación","exportVal":"Jira · ADO · GitHub","scenB":{"title":"El pago del plan anual cobra el precio mensual","sev":"Alta","comp":"Facturación","env":"Producción","dup":"Sin duplicado exacto","dupRes":"No se encontraron incidencias relacionadas","summary":"Elegir el plan anual en el pago aplica la tarifa mensual, por lo que el total de la factura es incorrecto y se cobra de menos a los clientes.","analysis":"Reproducido a partir de la grabación de pantalla: el interruptor anual actualiza la etiqueta visible, pero no el importe enviado a la API de pago. Clasificado como Facturación y calificado como Alta en la matriz de severidad del proyecto, ya que afecta a los cargos en cuentas activas. No se encontró ningún duplicado exacto en el gestor de incidencias.","pre":"Pasos para reproducir\n1. Abre la página de precios y cambia el plan a Anual\n2. Completa el pago con una tarjeta de prueba\n\nEsperado   La factura muestra el total anual.\nReal       La factura muestra la tarifa mensual.\n\nEn el registro   checkout.amount enviado como monthlyPrice."},"scenC":{"title":"Las capturas de pantalla añadidas como evidencia aparecen giradas en la vista previa del informe","sev":"Media","comp":"Adjuntos","env":"Staging","dup":"2 relacionadas, ninguna exacta","dupRes":"Se encontraron 2 incidencias relacionadas, ninguna exacta","summary":"Las capturas de pantalla verticales adjuntas a un informe se muestran de lado en la vista previa, lo que dificulta la lectura del área resaltada antes de registrar la incidencia.","analysis":"Reproducido a partir de la imagen adjunta: se descarta la orientación EXIF al generar la miniatura de la vista previa. Clasificado como Adjuntos y calificado como Media, ya que el archivo original se almacena intacto. Existen dos incidencias relacionadas, pero ninguna es un duplicado exacto.","pre":"Pasos para reproducir\n1. Inicia un informe y adjunta una captura de pantalla vertical\n2. Abre la vista previa del informe\n\nEsperado   La imagen se muestra en vertical.\nReal       La imagen se muestra girada 90 grados.\n\nEn el registro   miniatura generada sin la orientación EXIF."},"progress":"Completado · 100%"},"hero":{"badge":"Agente de QA de BugIt","title":"El ingeniero de QA con IA que <span>aprende tu proyecto.</span>","subtitle":"BugIt aprende tu proyecto: su terminología, sus reglas de severidad y sus tickets anteriores; y luego convierte notas sueltas en reportes revisados, verificados contra duplicados y sin riesgos de privacidad, listos para tu tracker."},"metrics":{"savedNum":"Listo en segundos","saved":"De notas sueltas a un reporte creado","dupeNum":"Entiende tu proyecto","dupe":"Terminología, severidad, tickets anteriores","setupNum":"Detecta duplicados","setup":"Señala problemas relacionados antes de crearlo","privateNum":"Privado por diseño","private":"Sin telemetría. Tus datos siguen siendo tuyos."},"under":{"features":"✓ Sin suscripción mensual","approval":"✓ Aprobación humana antes de crear el ticket","updates":"✓ Actualizaciones de software gratuitas","private":"✓ Política de reembolso de 7 días"},"a11y":{"openMenu":"Abrir menú","closeMenu":"Cerrar menú","language":"Idioma","siteNav":"Navegación del sitio","home":"Inicio de BugIt"},"pricing":{"limitedTag":"LIMITADA","refundNote":"Con una política de reembolso de 7 días.","refundLink":"Leer la política de reembolso"},"account":{"myAccount":"Mi cuenta","menu":"Menú de la cuenta"},"docs":{"refund":"Política de reembolso","refundDesc":"Nuestra política de reembolso de 7 días."}});
addMission("fr",{"mission":{"produces":"BugIt a rédigé le rapport ci-dessous","window":"BugIt Centre de Contrôle","head":"Apprentissage du projet","profile":"Terminologie du projet apprise","workflow":"Workflow QA importé","glossary":"Règles de sévérité chargées","severity":"Composant et environnement classés","duplicate":"Analyse des doublons terminée","redaction":"Analyse de confidentialité terminée","format":"Mise en forme pour le suivi prête","ready":"En attente de votre approbation","phases":["Lecture", "Workflow", "Sévérité", "Classification", "Doublons", "Confidentialité", "Mise en forme"],"acts":["Lecture du glossaire du projet","Import du workflow QA","Chargement des règles de sévérité","Classification du composant et de l'environnement","Recherche dans l'index des doublons","Analyse des informations sensibles","Mise en forme du rapport"],"resGloss":"{n} entrées de terminologie chargées","resWorkflow":"Workflow QA importé","resSeverity":"Matrice de sévérité détectée","resClass":"{comp} dans {env}","resPrivacy":"Analyse de confidentialité réussie","resFormat":"Mise en forme pour le suivi terminée","initializing":"Initialisation","complete":"Terminé","readyStream":"Prêt pour votre approbation"},"report":{"showFull":"Afficher le rapport complet","hideFull":"Masquer le rapport complet","label":"Analyse QA par IA","title":"Le bouton de connexion se désactive définitivement après des tentatives de connexion rapprochées","metaSevL":"Sévérité","metaSevV":"Élevée","metaCompL":"Composant","metaCompV":"Authentification","metaEnvL":"Environnement","metaEnvV":"Production","metaDupL":"Doublon","metaDupV":"1 apparenté, aucun exact","metaDupRes":"1 ticket apparenté trouvé, aucun exact","summaryTitle":"Résumé","summary":"Appuyer plusieurs fois sur Connexion pendant l'authentification désactive le bouton sans afficher d'erreur, laissant l'utilisateur bloqué sur l'écran de connexion.","analysisTitle":"Analyse par IA","analysis":"Reproduit à partir du journal joint : des erreurs 401 répétées lors du rafraîchissement du jeton laissent le bouton désactivé sans qu'aucune erreur ne soit affichée. Classé en Authentification et évalué comme Élevé sur la matrice de sévérité du projet, car la connexion est bloquée pour de vrais utilisateurs. Un ticket apparenté existe, mais aucun n'est un doublon exact.","pre":"Étapes de reproduction\n1. Ouvrir la page de connexion et saisir des identifiants valides\n2. Appuyer plusieurs fois rapidement sur Connexion\n\nAttendu   Connexion effectuée une seule fois.\nConstaté   Le bouton se bloque ; la connexion échoue sans message.\n\nD'après le journal   401 répété sur /session/refresh après expiration du jeton.","checkedTitle":"Vérifié automatiquement","chkSeverity":"Sévérité","chkComponent":"Composant","chkEnv":"Environnement","chkDupe":"Recherche de doublons","chkPii":"Analyse PII","chkFormat":"Mise en forme pour le suivi","privacyLabel":"Confidentialité","privacyVal":"Réussie","qualityLabel":"Qualité","qualityVal":"Note A","submitLabel":"Soumission","submitVal":"Approbation manuelle","exportLabel":"Export","exportVal":"Jira · ADO · GitHub","scenB":{"title":"Le paiement de l'offre annuelle facture le tarif mensuel","sev":"Élevée","comp":"Facturation","env":"Production","dup":"Aucun doublon exact","dupRes":"Aucun ticket apparenté trouvé","summary":"Choisir l'offre annuelle au moment du paiement applique le tarif mensuel, si bien que le total de la facture est erroné et que les clients sont sous-facturés.","analysis":"Reproduit à partir de l'enregistrement d'écran : le sélecteur annuel met à jour le libellé visible mais pas le montant envoyé à l'API de paiement. Classé en Facturation et évalué comme Élevé sur la matrice de sévérité du projet, car cela affecte les débits sur des comptes en production. Aucun doublon exact n'a été trouvé dans l'outil de suivi.","pre":"Étapes de reproduction\n1. Ouvrir la page des tarifs et basculer l'offre sur Annuel\n2. Finaliser le paiement avec une carte de test\n\nAttendu   La facture affiche le total annuel.\nConstaté   La facture affiche le tarif mensuel.\n\nD'après le journal   checkout.amount envoyé comme monthlyPrice."},"scenC":{"title":"Les captures d'écran ajoutées comme preuve apparaissent pivotées dans l'aperçu du rapport","sev":"Moyenne","comp":"Pièces jointes","env":"Staging","dup":"2 apparentés, aucun exact","dupRes":"2 tickets apparentés trouvés, aucun exact","summary":"Les captures d'écran en mode portrait jointes à un rapport s'affichent de côté dans l'aperçu, rendant la zone mise en évidence difficile à lire avant l'envoi.","analysis":"Reproduit à partir de l'image jointe : l'orientation EXIF est perdue lors de la génération de la vignette d'aperçu. Classé en Pièces jointes et évalué comme Moyen, car le fichier d'origine est conservé intact. Deux tickets apparentés existent, mais aucun n'est un doublon exact.","pre":"Étapes de reproduction\n1. Démarrer un rapport et joindre une capture d'écran en mode portrait\n2. Ouvrir l'aperçu du rapport\n\nAttendu   Image affichée à l'endroit.\nConstaté   Image pivotée de 90 degrés.\n\nD'après le journal   vignette générée sans l'orientation EXIF."},"progress":"Terminé · 100%"},"hero":{"badge":"Agent QA BugIt","title":"L'ingénieur QA IA qui <span>apprend votre projet.</span>","subtitle":"BugIt apprend votre projet : sa terminologie, ses règles de sévérité et vos tickets passés. Il transforme ensuite vos notes brutes en rapports vérifiés, dédupliqués et respectueux de la confidentialité, prêts pour votre outil de suivi."},"metrics":{"savedNum":"Prêt en quelques secondes","saved":"De la note brute au rapport déposé","dupeNum":"Comprend votre projet","dupe":"Terminologie, sévérité, tickets passés","setupNum":"Détecte les doublons","setup":"Signale les problèmes liés avant le dépôt","privateNum":"Confidentiel par conception","private":"Aucune télémétrie. Vos données restent les vôtres."},"under":{"features":"✓ Sans abonnement mensuel","approval":"✓ Validation humaine avant le dépôt","updates":"✓ Mises à jour logicielles gratuites","private":"✓ Remboursement sous 7 jours"},"a11y":{"openMenu":"Ouvrir le menu","closeMenu":"Fermer le menu","language":"Langue","siteNav":"Navigation du site","home":"Accueil BugIt"},"pricing":{"limitedTag":"LIMITÉE","refundNote":"Garanti par une politique de remboursement de 7 jours.","refundLink":"Lire la politique de remboursement"},"account":{"myAccount":"Mon compte","menu":"Menu du compte"},"docs":{"refund":"Politique de remboursement","refundDesc":"Notre politique de remboursement de 7 jours."},"integrations":{"crash":"PLANTAGES & TESTS"}});
addMission("de",{"mission":{"produces":"BugIt hat den Bericht unten geschrieben","window":"BugIt Kontrollzentrum","head":"Projekt wird eingelernt","profile":"Projektterminologie eingelernt","workflow":"QA-Workflow importiert","glossary":"Schweregrad-Regeln geladen","severity":"Komponente und Umgebung klassifiziert","duplicate":"Duplikatanalyse abgeschlossen","redaction":"Datenschutzprüfung abgeschlossen","format":"Tracker-Formatierung bereit","ready":"Warte auf deine Freigabe","phases":["Projekt lesen", "Workflow-Import", "Schweregrade", "Klassifizierung", "Duplikate", "Datenschutz", "Formatierung"],"acts":["Projektglossar wird gelesen","QA-Workflow wird importiert","Schweregrad-Regeln werden geladen","Komponente und Umgebung werden klassifiziert","Duplikat-Index wird durchsucht","Suche nach sensiblen Informationen","Bericht wird formatiert"],"resGloss":"{n} Terminologieeinträge geladen","resWorkflow":"QA-Workflow importiert","resSeverity":"Schweregrad-Matrix erkannt","resClass":"{comp} in {env}","resPrivacy":"Datenschutzprüfung bestanden","resFormat":"Tracker-Formatierung abgeschlossen","initializing":"Initialisierung","complete":"Abgeschlossen","readyStream":"Bereit für deine Freigabe"},"report":{"showFull":"Vollständigen Bericht anzeigen","hideFull":"Vollständigen Bericht ausblenden","label":"KI-QA-Analyse","title":"Login-Schaltfläche wird nach schnell aufeinanderfolgenden Anmeldeversuchen dauerhaft deaktiviert","metaSevL":"Schweregrad","metaSevV":"Hoch","metaCompL":"Komponente","metaCompV":"Authentifizierung","metaEnvL":"Umgebung","metaEnvV":"Produktion","metaDupL":"Duplikat","metaDupV":"1 verwandtes, keine exakten","metaDupRes":"1 verwandtes Problem gefunden, keine exakten Duplikate","summaryTitle":"Zusammenfassung","summary":"Mehrfaches Tippen auf Login während der Anmeldung deaktiviert die Schaltfläche ohne Fehlermeldung, sodass der Nutzer auf dem Anmeldebildschirm feststeckt.","analysisTitle":"KI-Analyse","analysis":"Aus dem angehängten Log reproduziert: Wiederholte 401-Fehler beim Token-Refresh lassen die Schaltfläche deaktiviert, ohne dass ein Fehler angezeigt wird. Als Authentifizierung klassifiziert und in der Schweregrad-Matrix des Projekts als Hoch eingestuft, da die Anmeldung für echte Nutzer blockiert ist. Es existiert ein verwandtes Ticket, aber keines ist ein exaktes Duplikat.","pre":"Schritte zur Reproduktion\n1. Anmeldeseite öffnen und gültige Zugangsdaten eingeben\n2. Mehrmals schnell auf Login tippen\n\nErwartet   Einmal angemeldet.\nTatsächlich   Schaltfläche blockiert; Anmeldung schlägt still fehl.\n\nAus dem Log   Wiederholte 401 auf /session/refresh nach Ablauf des Tokens.","checkedTitle":"Automatisch geprüft","chkSeverity":"Schweregrad","chkComponent":"Komponente","chkEnv":"Umgebung","chkDupe":"Duplikatsuche","chkPii":"PII-Prüfung","chkFormat":"Tracker-Formatierung","privacyLabel":"Datenschutz","privacyVal":"Bestanden","qualityLabel":"Qualität","qualityVal":"Note A","submitLabel":"Einreichung","submitVal":"Manuelle Freigabe","exportLabel":"Export","exportVal":"Jira · ADO · GitHub","scenB":{"title":"Beim Checkout des Jahresabos wird der Monatspreis berechnet","sev":"Hoch","comp":"Abrechnung","env":"Produktion","dup":"Kein exaktes Duplikat","dupRes":"Keine verwandten Probleme gefunden","summary":"Die Auswahl des Jahresabos beim Checkout wendet den Monatstarif an, sodass die Rechnungssumme falsch ist und Kunden zu wenig berechnet wird.","analysis":"Aus der Bildschirmaufnahme reproduziert: Der Jahres-Umschalter aktualisiert die sichtbare Bezeichnung, aber nicht den an die Zahlungs-API gesendeten Betrag. Als Abrechnung klassifiziert und in der Schweregrad-Matrix des Projekts als Hoch eingestuft, da es die Berechnung auf aktiven Konten betrifft. Im Tracker wurde kein exaktes Duplikat gefunden.","pre":"Schritte zur Reproduktion\n1. Preisseite öffnen und Abo auf Jährlich umstellen\n2. Checkout mit einer Testkarte abschließen\n\nErwartet   Rechnung zeigt die Jahressumme.\nTatsächlich   Rechnung zeigt den Monatstarif.\n\nAus dem Log   checkout.amount als monthlyPrice gesendet."},"scenC":{"title":"Als Nachweis angehängte Screenshots erscheinen in der Berichtsvorschau gedreht","sev":"Mittel","comp":"Anhänge","env":"Staging","dup":"2 verwandte, keine exakten","dupRes":"2 verwandte Probleme gefunden, keine exakten Duplikate","summary":"An einen Bericht angehängte Hochformat-Screenshots werden in der Vorschau seitwärts angezeigt, wodurch der markierte Bereich vor der Einreichung schwer erkennbar ist.","analysis":"Aus dem angehängten Bild reproduziert: Die EXIF-Ausrichtung geht bei der Erzeugung des Vorschau-Thumbnails verloren. Als Anhänge klassifiziert und als Mittel eingestuft, da die Originaldatei unverändert gespeichert bleibt. Es existieren zwei verwandte Tickets, aber keines ist ein exaktes Duplikat.","pre":"Schritte zur Reproduktion\n1. Einen Bericht starten und einen Hochformat-Screenshot anhängen\n2. Die Berichtsvorschau öffnen\n\nErwartet   Bild wird aufrecht angezeigt.\nTatsächlich   Bild um 90 Grad gedreht.\n\nAus dem Log   Thumbnail ohne EXIF-Ausrichtung erzeugt."},"progress":"Abgeschlossen · 100%"},"hero":{"badge":"BugIt QA-Agent","title":"Der KI-QA-Experte, der <span>Ihr Projekt versteht.</span>","subtitle":"BugIt lernt Ihr Projekt kennen - Terminologie, Schweregrad-Regeln und frühere Tickets - und macht aus groben Notizen geprüfte, auf Duplikate kontrollierte und datenschutzsichere Reports, bereit für Ihren Tracker."},"metrics":{"savedNum":"In Sekunden fertig","saved":"Von der Notiz zum fertigen Report","dupeNum":"Versteht Ihr Projekt","dupe":"Terminologie, Schweregrad, frühere Tickets","setupNum":"Erkennt Duplikate","setup":"Markiert verwandte Probleme vor dem Anlegen","privateNum":"Datenschutz von Grund auf","private":"Keine Telemetrie. Ihre Daten bleiben Ihre."},"under":{"features":"✓ Kein Monatsabo","approval":"✓ Freigabe durch Menschen vor dem Anlegen","updates":"✓ Kostenlose Software-Updates","private":"✓ 7 Tage Rückgaberecht"},"a11y":{"openMenu":"Menü öffnen","closeMenu":"Menü schließen","language":"Sprache","siteNav":"Website-Navigation","home":"BugIt Startseite"},"pricing":{"limitedTag":"BEGRENZT","refundNote":"Abgesichert durch eine 7-tägige Rückerstattungsrichtlinie.","refundLink":"Rückerstattungsrichtlinie lesen"},"account":{"myAccount":"Mein Konto","menu":"Kontomenü"},"docs":{"refund":"Rückerstattungsrichtlinie","refundDesc":"Unsere 7-tägige Rückerstattungsrichtlinie."},"integrations":{"crash":"ABSTÜRZE & TESTS"}});
addMission("pt-br",{"mission":{"produces":"O BugIt escreveu o relatório abaixo","window":"BugIt Centro de Controle","head":"Aprendizado do projeto","profile":"Terminologia do projeto aprendida","workflow":"Fluxo de QA importado","glossary":"Regras de severidade carregadas","severity":"Componente e ambiente classificados","duplicate":"Análise de duplicatas concluída","redaction":"Varredura de privacidade concluída","format":"Formatação para o rastreador pronta","ready":"Aguardando sua aprovação","phases":["Lendo projeto", "Importando fluxo", "Severidade", "Classificando", "Duplicatas", "Privacidade", "Formatando"],"acts":["Lendo o glossário do projeto","Importando fluxo de QA","Carregando regras de severidade","Classificando componente e ambiente","Buscando no índice de duplicatas","Verificando informações sensíveis","Formatando o relatório"],"resGloss":"{n} entradas de terminologia carregadas","resWorkflow":"Fluxo de QA importado","resSeverity":"Matriz de severidade detectada","resClass":"{comp} em {env}","resPrivacy":"Varredura de privacidade aprovada","resFormat":"Formatação para o rastreador concluída","initializing":"Inicializando","complete":"Concluído","readyStream":"Pronto para sua aprovação"},"report":{"showFull":"Ver o relatório completo","hideFull":"Ocultar o relatório completo","label":"Análise de QA por IA","title":"O botão de login fica permanentemente desabilitado após tentativas rápidas de entrada","metaSevL":"Severidade","metaSevV":"Alta","metaCompL":"Componente","metaCompV":"Autenticação","metaEnvL":"Ambiente","metaEnvV":"Produção","metaDupL":"Duplicata","metaDupV":"1 relacionada, nenhuma exata","metaDupRes":"1 problema relacionado encontrado, nenhum exato","summaryTitle":"Resumo","summary":"Tocar em Login várias vezes durante a entrada desabilita o botão sem exibir nenhum erro, deixando o usuário preso na tela de login.","analysisTitle":"Análise por IA","analysis":"Reproduzido a partir do log anexado: repetidos 401 na renovação do token deixam o botão desabilitado sem exibir nenhum erro. Classificado como Autenticação e avaliado como Alta na matriz de severidade do projeto, já que o login fica bloqueado para usuários reais. Existe um chamado relacionado, mas nenhum é uma duplicata exata.","pre":"Passos para reproduzir\n1. Abra a página de login e informe credenciais válidas\n2. Toque em Login várias vezes rapidamente\n\nEsperado   Login realizado uma única vez.\nObtido     O botão trava; o login falha silenciosamente.\n\nNo log   401 repetido em /session/refresh após a expiração do token.","checkedTitle":"Verificado automaticamente","chkSeverity":"Severidade","chkComponent":"Componente","chkEnv":"Ambiente","chkDupe":"Busca de duplicatas","chkPii":"Varredura de PII","chkFormat":"Formatação para o rastreador","privacyLabel":"Privacidade","privacyVal":"Aprovada","qualityLabel":"Qualidade","qualityVal":"Nota A","submitLabel":"Envio","submitVal":"Aprovação manual","exportLabel":"Exportação","exportVal":"Jira · ADO · GitHub","scenB":{"title":"O checkout do plano anual cobra o preço mensal","sev":"Alta","comp":"Faturamento","env":"Produção","dup":"Nenhuma duplicata exata","dupRes":"Nenhum problema relacionado encontrado","summary":"Escolher o plano anual no checkout aplica a tarifa mensal, então o total da fatura fica incorreto e os clientes são cobrados a menos.","analysis":"Reproduzido a partir da gravação de tela: o botão do plano anual atualiza o rótulo visível, mas não o valor enviado à API de pagamento. Classificado como Faturamento e avaliado como Alta na matriz de severidade do projeto, já que afeta cobranças em contas ativas. Nenhuma duplicata exata foi encontrada no rastreador.","pre":"Passos para reproduzir\n1. Abra a página de preços e mude o plano para Anual\n2. Conclua o checkout com um cartão de teste\n\nEsperado   A fatura mostra o total anual.\nObtido     A fatura mostra a tarifa mensal.\n\nNo log   checkout.amount enviado como monthlyPrice."},"scenC":{"title":"Capturas de tela adicionadas como evidência aparecem giradas na prévia do relatório","sev":"Média","comp":"Anexos","env":"Homologação","dup":"2 relacionadas, nenhuma exata","dupRes":"2 problemas relacionados encontrados, nenhum exato","summary":"Capturas de tela em retrato anexadas a um relatório aparecem de lado na prévia, dificultando a leitura da área destacada antes do envio.","analysis":"Reproduzido a partir da imagem anexada: a orientação EXIF é descartada quando a miniatura da prévia é gerada. Classificado como Anexos e avaliado como Média, já que o arquivo original é armazenado intacto. Existem dois chamados relacionados, mas nenhum é uma duplicata exata.","pre":"Passos para reproduzir\n1. Inicie um relatório e anexe uma captura de tela em retrato\n2. Abra a prévia do relatório\n\nEsperado   Imagem exibida na vertical.\nObtido     Imagem girada 90 graus.\n\nNo log   miniatura gerada sem a orientação EXIF."},"progress":"Concluído · 100%"},"hero":{"badge":"Agente de QA da BugIt","title":"O engenheiro de QA com IA que <span>aprende o seu projeto.</span>","subtitle":"A BugIt aprende o seu projeto: sua terminologia, regras de severidade e chamados anteriores. Depois transforma anotações soltas em relatórios revisados, sem duplicatas e sem expor dados sensíveis, prontos para o seu rastreador."},"metrics":{"savedNum":"Pronto em segundos","saved":"De anotações soltas a um chamado registrado","dupeNum":"Entende o seu projeto","dupe":"Terminologia, severidade, chamados anteriores","setupNum":"Encontra duplicatas","setup":"Aponta problemas relacionados antes de você registrar","privateNum":"Privado por design","private":"Sem telemetria. Seus dados continuam seus."},"under":{"features":"✓ Sem assinatura mensal","approval":"✓ Aprovação humana antes de registrar","updates":"✓ Atualizações de software gratuitas","private":"✓ Política de reembolso de 7 dias"},"a11y":{"openMenu":"Abrir menu","closeMenu":"Fechar menu","language":"Idioma","siteNav":"Navegação do site","home":"Início do BugIt"},"pricing":{"limitedTag":"LIMITADA","refundNote":"Com política de reembolso de 7 dias.","refundLink":"Ler a política de reembolso"},"account":{"myAccount":"Minha conta","menu":"Menu da conta"},"docs":{"refund":"Política de reembolso","refundDesc":"Nossa política de reembolso de 7 dias."}});
addMission("it",{"mission":{"produces":"BugIt ha scritto il rapporto qui sotto","window":"BugIt Centro di Controllo","head":"Apprendimento del progetto","profile":"Terminologia del progetto appresa","workflow":"Workflow di QA importato","glossary":"Regole di gravità caricate","severity":"Componente e ambiente classificati","duplicate":"Analisi dei duplicati completata","redaction":"Scansione della privacy completata","format":"Formattazione per il tracker pronta","ready":"In attesa della tua approvazione","phases":["Lettura", "Importazione", "Gravità", "Classificazione", "Duplicati", "Privacy", "Formattazione"],"acts":["Lettura del glossario del progetto","Importazione del workflow di QA","Caricamento delle regole di gravità","Classificazione di componente e ambiente","Ricerca nell'indice dei duplicati","Scansione delle informazioni sensibili","Formattazione del report"],"resGloss":"{n} voci terminologiche caricate","resWorkflow":"Workflow di QA importato","resSeverity":"Matrice di gravità rilevata","resClass":"{comp} in ambiente {env}","resPrivacy":"Scansione della privacy superata","resFormat":"Formattazione per il tracker completata","initializing":"Inizializzazione","complete":"Completato","readyStream":"Pronto per la tua approvazione"},"report":{"showFull":"Mostra il rapporto completo","hideFull":"Nascondi il rapporto completo","label":"Analisi QA con IA","title":"Il pulsante di accesso rimane disabilitato in modo permanente dopo tentativi di accesso ravvicinati","metaSevL":"Gravità","metaSevV":"Alta","metaCompL":"Componente","metaCompV":"Autenticazione","metaEnvL":"Ambiente","metaEnvV":"Produzione","metaDupL":"Duplicato","metaDupV":"1 correlato, nessuno esatto","metaDupRes":"Trovato 1 problema correlato, nessuno esatto","summaryTitle":"Riepilogo","summary":"Toccando Accedi più volte durante l'accesso, il pulsante si disabilita senza mostrare alcun errore, lasciando l'utente bloccato nella schermata di accesso.","analysisTitle":"Analisi con IA","analysis":"Riprodotto dal log allegato: ripetuti errori 401 al refresh del token lasciano il pulsante disabilitato senza mostrare alcun errore. Classificato come Autenticazione e valutato Alta sulla matrice di gravità del progetto, poiché l'accesso è bloccato per gli utenti reali. Esiste un ticket correlato, ma nessuno è un duplicato esatto.","pre":"Passi per riprodurre\n1. Apri la pagina di accesso e inserisci credenziali valide\n2. Tocca Accedi più volte rapidamente\n\nAtteso     Accesso eseguito una sola volta.\nEffettivo  Il pulsante si blocca; l'accesso fallisce silenziosamente.\n\nDal log    401 ripetuti su /session/refresh dopo la scadenza del token.","checkedTitle":"Verificato automaticamente","chkSeverity":"Gravità","chkComponent":"Componente","chkEnv":"Ambiente","chkDupe":"Ricerca duplicati","chkPii":"Scansione PII","chkFormat":"Formattazione per il tracker","privacyLabel":"Privacy","privacyVal":"Superata","qualityLabel":"Qualità","qualityVal":"Voto A","submitLabel":"Invio","submitVal":"Approvazione manuale","exportLabel":"Esportazione","exportVal":"Jira · ADO · GitHub","scenB":{"title":"Il checkout del piano annuale addebita il prezzo mensile","sev":"Alta","comp":"Fatturazione","env":"Produzione","dup":"Nessun duplicato esatto","dupRes":"Nessun problema correlato trovato","summary":"Scegliendo il piano annuale al checkout viene applicata la tariffa mensile, quindi il totale della fattura è errato e ai clienti viene addebitato un importo inferiore.","analysis":"Riprodotto dalla registrazione dello schermo: l'interruttore annuale aggiorna l'etichetta visibile ma non l'importo inviato all'API di pagamento. Classificato come Fatturazione e valutato Alta sulla matrice di gravità del progetto, poiché incide sugli addebiti degli account attivi. Nessun duplicato esatto è stato trovato nel tracker.","pre":"Passi per riprodurre\n1. Apri la pagina dei prezzi e imposta il piano su Annuale\n2. Completa il checkout con una carta di prova\n\nAtteso     La fattura mostra il totale annuale.\nEffettivo  La fattura mostra la tariffa mensile.\n\nDal log    checkout.amount inviato come monthlyPrice."},"scenC":{"title":"Gli screenshot aggiunti come prova appaiono ruotati nell'anteprima del report","sev":"Media","comp":"Allegati","env":"Staging","dup":"2 correlati, nessuno esatto","dupRes":"Trovati 2 problemi correlati, nessuno esatto","summary":"Gli screenshot in verticale allegati a un report vengono mostrati di lato nell'anteprima, rendendo difficile leggere l'area evidenziata prima dell'invio.","analysis":"Riprodotto dall'immagine allegata: l'orientamento EXIF viene perso durante la generazione della miniatura di anteprima. Classificato come Allegati e valutato Media, poiché il file originale è archiviato intatto. Esistono due ticket correlati, ma nessuno è un duplicato esatto.","pre":"Passi per riprodurre\n1. Avvia un report e allega uno screenshot in verticale\n2. Apri l'anteprima del report\n\nAtteso     Immagine mostrata dritta.\nEffettivo  Immagine ruotata di 90 gradi.\n\nDal log    miniatura generata senza orientamento EXIF."},"progress":"Completato · 100%"},"hero":{"badge":"Agente QA BugIt","title":"L'ingegnere QA con AI che <span>impara il tuo progetto.</span>","subtitle":"BugIt impara il tuo progetto: terminologia, regole di severità e ticket passati. Poi trasforma appunti grezzi in report revisionati, controllati contro i duplicati e sicuri per la privacy, pronti per il tuo tracker."},"metrics":{"savedNum":"Pronto in pochi secondi","saved":"Dagli appunti grezzi al report registrato","dupeNum":"Comprende il tuo progetto","dupe":"Terminologia, severità, ticket passati","setupNum":"Trova i duplicati","setup":"Segnala problemi correlati prima che tu apra il ticket","privateNum":"Privacy fin dalla progettazione","private":"Nessuna telemetria. I tuoi dati restano tuoi."},"under":{"features":"✓ Nessun abbonamento mensile","approval":"✓ Approvazione umana prima dell'apertura del ticket","updates":"✓ Aggiornamenti software gratuiti","private":"✓ Politica di rimborso entro 7 giorni"},"a11y":{"openMenu":"Apri menu","closeMenu":"Chiudi menu","language":"Lingua","siteNav":"Navigazione del sito","home":"Home di BugIt"},"pricing":{"limitedTag":"LIMITATA","refundNote":"Con una politica di rimborso di 7 giorni.","refundLink":"Leggi la politica di rimborso"},"account":{"myAccount":"Il mio account","menu":"Menu account"},"docs":{"refund":"Politica di rimborso","refundDesc":"La nostra politica di rimborso di 7 giorni."}});
addMission("ko",{"mission":{"produces":"BugIt가 아래 리포트를 작성했습니다","window":"BugIt 미션 컨트롤","head":"프로젝트 학습","profile":"프로젝트 용어 학습 완료","workflow":"QA 워크플로 가져오기 완료","glossary":"심각도 규칙 로드 완료","severity":"구성 요소 및 환경 분류 완료","duplicate":"중복 분석 완료","redaction":"개인정보 스캔 완료","format":"트래커 서식 준비 완료","ready":"승인 대기 중","phases":["프로젝트 읽는 중", "워크플로 가져오는 중", "심각도 로드 중", "분류 중", "중복 검색 중", "개인정보 스캔", "서식 지정 중"],"acts":["프로젝트 용어집 읽는 중","QA 워크플로 가져오는 중","심각도 규칙 로드 중","구성 요소 및 환경 분류 중","중복 인덱스 검색 중","민감 정보 스캔 중","리포트 서식 지정 중"],"resGloss":"용어 항목 {n}개 로드 완료","resWorkflow":"QA 워크플로 가져오기 완료","resSeverity":"심각도 매트릭스 감지됨","resClass":"{env}의 {comp}","resPrivacy":"개인정보 스캔 통과","resFormat":"트래커 서식 지정 완료","initializing":"프로젝트 초기화 중","complete":"완료","readyStream":"승인 대기 중"},"report":{"showFull":"전체 리포트 보기","hideFull":"전체 리포트 숨기기","label":"AI QA 분석","title":"로그인 시도를 빠르게 반복하면 로그인 버튼이 영구적으로 비활성화됨","metaSevL":"심각도","metaSevV":"높음","metaCompL":"구성 요소","metaCompV":"인증","metaEnvL":"환경","metaEnvV":"프로덕션","metaDupL":"중복","metaDupV":"관련 1건, 완전 일치 없음","metaDupRes":"관련 이슈 1건 발견, 완전 일치 없음","summaryTitle":"요약","summary":"로그인 중에 로그인 버튼을 여러 번 누르면 아무런 오류 표시 없이 버튼이 비활성화되어, 사용자가 로그인 화면에서 벗어나지 못하게 됩니다.","analysisTitle":"AI 분석","analysis":"첨부된 로그로 재현됨: 토큰 갱신 시 401이 반복되면서 오류가 표시되지 않은 채 버튼이 비활성화됩니다. 실제 사용자의 로그인이 차단되므로 인증으로 분류하고 프로젝트 심각도 매트릭스 기준 높음으로 평가했습니다. 관련 티켓이 1건 있으나 완전히 중복되는 것은 없습니다.","pre":"재현 단계\n1. 로그인 페이지를 열고 올바른 자격 증명 입력\n2. 로그인 버튼을 빠르게 여러 번 누름\n\n예상 결과   한 번만 로그인됨.\n실제 결과   버튼이 잠기고 로그인이 아무런 알림 없이 실패함.\n\n로그 확인   토큰 만료 후 /session/refresh 에서 401 반복 발생.","checkedTitle":"자동 점검 완료","chkSeverity":"심각도","chkComponent":"구성 요소","chkEnv":"환경","chkDupe":"중복 검색","chkPii":"PII 스캔","chkFormat":"트래커 서식","privacyLabel":"개인정보","privacyVal":"통과","qualityLabel":"품질","qualityVal":"A등급","submitLabel":"제출","submitVal":"수동 승인","exportLabel":"내보내기","exportVal":"Jira · ADO · GitHub","scenB":{"title":"연간 요금제로 결제 시 월간 요금이 청구됨","sev":"높음","comp":"결제","env":"프로덕션","dup":"완전 일치 중복 없음","dupRes":"관련 이슈가 발견되지 않음","summary":"결제 시 연간 요금제를 선택해도 월간 요금이 적용되어, 청구 금액이 잘못되고 고객에게 과소 청구됩니다.","analysis":"화면 녹화로 재현됨: 연간 토글이 화면에 표시되는 라벨은 갱신하지만 결제 API로 전송되는 금액은 갱신하지 않습니다. 실 계정의 청구 금액에 영향을 미치므로 결제로 분류하고 프로젝트 심각도 매트릭스 기준 높음으로 평가했습니다. 트래커에서 완전히 일치하는 중복은 발견되지 않았습니다.","pre":"재현 단계\n1. 요금제 페이지를 열고 요금제를 연간으로 전환\n2. 테스트 카드로 결제 완료\n\n예상 결과   청구서에 연간 총액이 표시됨.\n실제 결과   청구서에 월간 요금이 표시됨.\n\n로그 확인   checkout.amount 가 monthlyPrice 로 전송됨."},"scenC":{"title":"증거로 첨부한 스크린샷이 리포트 미리보기에서 회전되어 표시됨","sev":"보통","comp":"첨부 파일","env":"스테이징","dup":"관련 2건, 완전 일치 없음","dupRes":"관련 이슈 2건 발견, 완전 일치 없음","summary":"리포트에 첨부한 세로 방향 스크린샷이 미리보기에서 옆으로 눕혀져 표시되어, 등록 전에 강조된 영역을 알아보기 어렵습니다.","analysis":"첨부된 이미지로 재현됨: 미리보기 썸네일을 생성할 때 EXIF 방향 정보가 누락됩니다. 원본 파일은 그대로 저장되므로 첨부 파일로 분류하고 보통으로 평가했습니다. 관련 티켓이 2건 있으나 완전히 중복되는 것은 없습니다.","pre":"재현 단계\n1. 리포트를 시작하고 세로 방향 스크린샷 첨부\n2. 리포트 미리보기 열기\n\n예상 결과   이미지가 똑바로 표시됨.\n실제 결과   이미지가 90도 회전됨.\n\n로그 확인   EXIF 방향 정보 없이 썸네일이 생성됨."},"progress":"완료 · 100%"},"hero":{"badge":"BugIt QA 에이전트","title":"당신의 <span>프로젝트를 학습하는</span> AI QA 엔지니어","subtitle":"BugIt는 프로젝트의 용어, 심각도 기준, 과거 티켓까지 학습한 뒤, 대략적인 메모를 검토와 중복 확인을 거친 개인정보 안전 리포트로 완성해 트래커에 바로 등록할 수 있게 준비합니다."},"metrics":{"savedNum":"몇 초 만에 완성","saved":"간단한 메모가 등록 가능한 리포트로","dupeNum":"프로젝트를 이해합니다","dupe":"용어, 심각도, 과거 티켓까지","setupNum":"중복을 찾아냅니다","setup":"등록 전에 관련 이슈를 알려드립니다","privateNum":"설계부터 프라이버시 우선","private":"텔레메트리 없음. 데이터는 온전히 당신의 것."},"under":{"features":"✓ 월 구독료 없음","approval":"✓ 등록 전 사람의 최종 승인","updates":"✓ 무료 소프트웨어 업데이트","private":"✓ 7일 환불 정책"},"a11y":{"openMenu":"메뉴 열기","closeMenu":"메뉴 닫기","language":"언어","siteNav":"사이트 탐색","home":"BugIt 홈"},"pricing":{"limitedTag":"한정","refundNote":"7일 환불 정책이 적용됩니다.","refundLink":"환불 정책 읽기"},"account":{"myAccount":"내 계정","menu":"계정 메뉴"},"docs":{"refund":"환불 정책","refundDesc":"7일 환불 정책입니다."}});
addMission("zh",{"mission":{"produces":"BugIt 生成了下面的报告","window":"BugIt 任务控制台","head":"项目学习","profile":"已学习项目术语","workflow":"已导入 QA 工作流","glossary":"已加载严重级别规则","severity":"已归类组件与环境","duplicate":"重复项分析完成","redaction":"隐私扫描完成","format":"跟踪工具格式已就绪","ready":"等待你的审批","phases":["读取项目", "导入工作流", "加载严重级别", "归类中", "搜索重复项", "隐私扫描", "格式化"],"acts":["读取项目术语表","导入 QA 工作流","加载严重级别规则","归类组件与环境","搜索重复项索引","扫描敏感信息","格式化报告"],"resGloss":"已加载 {n} 条术语","resWorkflow":"已导入 QA 工作流","resSeverity":"已识别严重级别矩阵","resClass":"{env}中的{comp}","resPrivacy":"隐私扫描通过","resFormat":"跟踪工具格式化完成","initializing":"正在初始化项目","complete":"完成","readyStream":"已就绪，等待你的审批"},"report":{"showFull":"查看完整报告","hideFull":"收起完整报告","label":"AI QA 分析","title":"快速多次尝试登录后，登录按钮被永久禁用","metaSevL":"严重级别","metaSevV":"高","metaCompL":"组件","metaCompV":"身份验证","metaEnvL":"环境","metaEnvV":"生产环境","metaDupL":"重复项","metaDupV":"1 项相关，无完全相同","metaDupRes":"找到 1 个相关问题，无完全相同","summaryTitle":"摘要","summary":"登录过程中多次点击“登录”会导致按钮被禁用，且未显示任何错误，用户因此卡在登录页面无法继续。","analysisTitle":"AI 分析","analysis":"根据所附日志复现：令牌刷新时反复返回 401，导致按钮被禁用且未向用户提示任何错误。按项目严重级别矩阵归类为身份验证问题，评为高级别，因为真实用户被阻挡在登录之外。存在 1 个相关工单，但没有完全相同的重复项。","pre":"复现步骤\n1. 打开登录页面并输入有效凭据\n2. 快速多次点击“登录”\n\n预期结果   仅登录一次。\n实际结果   按钮被锁定；登录静默失败，无任何提示。\n\n日志摘录   令牌过期后 /session/refresh 反复返回 401。","checkedTitle":"自动检查项","chkSeverity":"严重级别","chkComponent":"组件","chkEnv":"环境","chkDupe":"重复项搜索","chkPii":"PII 扫描","chkFormat":"跟踪工具格式化","privacyLabel":"隐私","privacyVal":"通过","qualityLabel":"质量","qualityVal":"A 级","submitLabel":"提交","submitVal":"人工审批","exportLabel":"导出","exportVal":"Jira · ADO · GitHub","scenB":{"title":"结算年度套餐时按月度价格扣费","sev":"高","comp":"计费","env":"生产环境","dup":"无完全相同的重复项","dupRes":"未找到相关问题","summary":"在结算时选择年度套餐却套用了月度价格，导致账单总额有误，客户被少收费用。","analysis":"根据屏幕录像复现：切换到年度选项后仅更新了可见标签，但发送给支付 API 的金额并未随之更新。按项目严重级别矩阵归类为计费问题，评为高级别，因为它影响到正式账户的实际扣费。跟踪工具中未找到完全相同的重复项。","pre":"复现步骤\n1. 打开定价页面并将套餐切换为年度\n2. 使用测试卡完成结算\n\n预期结果   账单显示年度总额。\n实际结果   账单显示月度价格。\n\n日志摘录   checkout.amount 以 monthlyPrice 发送。"},"scenC":{"title":"作为证据添加的截图在报告预览中显示为旋转状态","sev":"中","comp":"附件","env":"预发布环境","dup":"2 项相关，无完全相同","dupRes":"找到 2 个相关问题，无完全相同","summary":"附加到报告中的竖向截图在预览中显示为横向，导致提交前难以看清重点标注的区域。","analysis":"根据所附图片复现：生成预览缩略图时丢失了 EXIF 方向信息。归类为附件问题，评为中级别，因为原始文件仍完整保存。存在 2 个相关工单，但没有完全相同的重复项。","pre":"复现步骤\n1. 新建报告并附加一张竖向截图\n2. 打开报告预览\n\n预期结果   图片正立显示。\n实际结果   图片旋转了 90 度。\n\n日志摘录   生成缩略图时未保留 EXIF 方向信息。"},"progress":"完成 · 100%"},"hero":{"badge":"BugIt QA 智能体","title":"懂你项目的 AI QA 工程师，<span>越用越懂你。</span>","subtitle":"BugIt 会学习你的项目：术语体系、严重级别规则以及历史工单，把零散笔记转化为经过审核、去重校验、隐私安全的报告，随时可提交到你的追踪系统。"},"metrics":{"savedNum":"数秒即成","saved":"从零散笔记到正式报告","dupeNum":"读懂你的项目","dupe":"术语、严重级别、历史工单","setupNum":"自动查重","setup":"提交前先标记相关问题","privateNum":"隐私为本","private":"无遥测采集，数据始终归你所有。"},"under":{"features":"✓ 无需按月订阅","approval":"✓ 提交前需人工确认","updates":"✓ 免费软件更新","private":"✓ 7 天退款保障"},"a11y":{"openMenu":"打开菜单","closeMenu":"关闭菜单","language":"语言","siteNav":"网站导航","home":"BugIt 主页"},"pricing":{"limitedTag":"限时","refundNote":"提供 7 天退款保障。","refundLink":"阅读退款政策"},"account":{"myAccount":"我的账户","menu":"账户菜单"},"docs":{"refund":"退款政策","refundDesc":"我们的 7 天退款政策。"}});
addMission("ru",{"mission":{"produces":"BugIt составил отчёт ниже","window":"BugIt Центр управления","head":"Изучение проекта","profile":"Изучена терминология проекта","workflow":"Импортирован процесс QA","glossary":"Загружены правила серьёзности","severity":"Определены компонент и окружение","duplicate":"Анализ дубликатов завершён","redaction":"Проверка конфиденциальности завершена","format":"Форматирование для трекера готово","ready":"Ожидание вашего подтверждения","phases":["Чтение", "Импорт процесса", "Серьёзность", "Классификация", "Дубликаты", "Приватность", "Форматирование"],"acts":["Чтение глоссария проекта","Импорт процесса QA","Загрузка правил серьёзности","Классификация компонента и окружения","Поиск по индексу дубликатов","Сканирование на конфиденциальные данные","Форматирование отчёта"],"resGloss":"Загружено записей терминологии: {n}","resWorkflow":"Процесс QA импортирован","resSeverity":"Обнаружена матрица серьёзности","resClass":"{comp} в {env}","resPrivacy":"Проверка конфиденциальности пройдена","resFormat":"Форматирование для трекера завершено","initializing":"Инициализация","complete":"Готово","readyStream":"Готово к вашему подтверждению"},"report":{"showFull":"Показать полный отчёт","hideFull":"Скрыть полный отчёт","label":"QA-анализ ИИ","title":"Кнопка входа навсегда блокируется после серии быстрых попыток входа","metaSevL":"Серьёзность","metaSevV":"Высокая","metaCompL":"Компонент","metaCompV":"Аутентификация","metaEnvL":"Окружение","metaEnvV":"Продакшн","metaDupL":"Дубликат","metaDupV":"1 похожая, точных нет","metaDupRes":"Найдена 1 похожая задача, точных совпадений нет","summaryTitle":"Краткое описание","summary":"Несколько нажатий на «Войти» во время входа блокируют кнопку без вывода ошибки, и пользователь застревает на экране входа.","analysisTitle":"Анализ ИИ","analysis":"Воспроизведено по прикреплённому логу: повторяющиеся ответы 401 при обновлении токена оставляют кнопку заблокированной, ошибка при этом не выводится. Классифицировано как «Аутентификация» и оценено как «Высокая» по матрице серьёзности проекта, поскольку вход блокируется для реальных пользователей. Есть одна связанная задача, но точных дубликатов нет.","pre":"Шаги для воспроизведения\n1. Откройте страницу входа и введите корректные учётные данные\n2. Быстро нажмите «Войти» несколько раз\n\nОжидается   Однократный вход в систему.\nФактически   Кнопка блокируется; вход завершается неудачей без сообщений.\n\nИз лога   Повторяющиеся 401 на /session/refresh после истечения срока действия токена.","checkedTitle":"Проверено автоматически","chkSeverity":"Серьёзность","chkComponent":"Компонент","chkEnv":"Окружение","chkDupe":"Поиск дубликатов","chkPii":"Сканирование PII","chkFormat":"Форматирование для трекера","privacyLabel":"Конфиденциальность","privacyVal":"Пройдено","qualityLabel":"Качество","qualityVal":"Высший класс","submitLabel":"Отправка","submitVal":"Ручное подтверждение","exportLabel":"Экспорт","exportVal":"Jira · ADO · GitHub","scenB":{"title":"При оформлении годового плана списывается цена месячного","sev":"Высокая","comp":"Биллинг","env":"Продакшн","dup":"Точных дубликатов нет","dupRes":"Связанных задач не найдено","summary":"При выборе годового плана на оформлении применяется месячная ставка, из-за чего итог в счёте неверен и с клиентов списывается меньше положенного.","analysis":"Воспроизведено по записи экрана: переключатель годового плана обновляет видимую подпись, но не сумму, отправляемую в платёжный API. Классифицировано как «Биллинг» и оценено как «Высокая» по матрице серьёзности проекта, поскольку затрагивает списания по действующим аккаунтам. Точных дубликатов в трекере не найдено.","pre":"Шаги для воспроизведения\n1. Откройте страницу тарифов и переключите план на годовой\n2. Завершите оформление с тестовой картой\n\nОжидается   В счёте отображается годовая сумма.\nФактически   В счёте отображается месячная ставка.\n\nИз лога   checkout.amount отправлен как monthlyPrice."},"scenC":{"title":"Скриншоты, добавленные как доказательства, отображаются повёрнутыми в предпросмотре отчёта","sev":"Средняя","comp":"Вложения","env":"Стейджинг","dup":"2 похожие, точных нет","dupRes":"Найдено 2 похожие задачи, точных совпадений нет","summary":"Вертикальные скриншоты, прикреплённые к отчёту, показываются в предпросмотре боком, из-за чего выделенную область трудно рассмотреть перед отправкой.","analysis":"Воспроизведено по прикреплённому изображению: ориентация EXIF теряется при генерации миниатюры для предпросмотра. Классифицировано как «Вложения» и оценено как «Средняя», поскольку исходный файл сохраняется без изменений. Есть две связанные задачи, но точных дубликатов нет.","pre":"Шаги для воспроизведения\n1. Начните отчёт и прикрепите вертикальный скриншот\n2. Откройте предпросмотр отчёта\n\nОжидается   Изображение показано вертикально.\nФактически   Изображение повёрнуто на 90 градусов.\n\nИз лога   миниатюра сгенерирована без ориентации EXIF."},"progress":"Готово · 100%"},"hero":{"badge":"QA-агент BugIt","title":"ИИ-инженер QA, который <span>изучает ваш проект.</span>","subtitle":"BugIt изучает ваш проект: его терминологию, правила уровней серьёзности и прошлые тикеты. Затем превращает черновые заметки в проверенные отчёты без дубликатов и с защитой данных, готовые к отправке в ваш трекер."},"metrics":{"savedNum":"Готово за секунды","saved":"От черновых заметок до готового отчёта","dupeNum":"Понимает ваш проект","dupe":"Терминология, приоритеты, прошлые тикеты","setupNum":"Находит дубликаты","setup":"Отмечает похожие задачи до отправки","privateNum":"Конфиденциальность в основе","private":"Никакой телеметрии. Ваши данные остаются вашими."},"under":{"features":"✓ Без ежемесячной подписки","approval":"✓ Отправка только после подтверждения человеком","updates":"✓ Бесплатные обновления программы","private":"✓ Возврат средств в течение 7 дней"},"a11y":{"openMenu":"Открыть меню","closeMenu":"Закрыть меню","language":"Язык","siteNav":"Навигация по сайту","home":"Главная BugIt"},"pricing":{"limitedTag":"АКЦИЯ","refundNote":"С гарантией возврата средств в течение 7 дней.","refundLink":"Читать политику возврата"},"account":{"myAccount":"Мой аккаунт","menu":"Меню аккаунта"},"docs":{"refund":"Политика возврата","refundDesc":"Наша политика возврата за 7 дней."}});


















/* === english-only support notice (injected) === */
const supportEnglishOnly={"ar":"يجب تقديم تذاكر الدعم باللغة الإنجليزية. الصفحات المترجمة من الموقع متوفرة لراحتك ولا تعني أن Taskivator تقدّم الدعم بكل اللغات المعروضة.","en":"Support tickets must be submitted in English. Localized website pages are provided for your convenience and do not mean that Taskivator provides support in every listed language.","de":"Support-Tickets müssen auf Englisch eingereicht werden. Die lokalisierten Website-Seiten dienen nur Ihrer Bequemlichkeit und bedeuten nicht, dass Taskivator Support in jeder aufgeführten Sprache anbietet.","fr":"Les tickets d'assistance doivent être soumis en anglais. Les pages localisées du site sont fournies pour votre confort et ne signifient pas que Taskivator propose une assistance dans toutes les langues répertoriées.","es":"Los tickets de soporte deben enviarse en inglés. Las páginas localizadas del sitio se ofrecen para su comodidad y no implican que Taskivator preste soporte en todos los idiomas disponibles.","it":"I ticket di supporto devono essere inviati in inglese. Le pagine localizzate del sito sono fornite per comodità e non implicano che Taskivator offra assistenza in tutte le lingue elencate.","pt-br":"Os tickets de suporte devem ser enviados em inglês. As páginas localizadas do site são oferecidas por conveniência e não significam que a Taskivator ofereça suporte em todos os idiomas listados.","ja":"サポートチケットは英語でご送信ください。ローカライズされたウェブサイトのページは利便性のために提供されており、Taskivator がすべての対応言語でサポートを提供することを意味するものではありません。","ko":"지원 티켓은 영어로 제출해야 합니다. 현지화된 웹사이트 페이지는 편의를 위해 제공되며, Taskivator가 표시된 모든 언어로 지원을 제공한다는 의미는 아닙니다.","zh":"支持工单必须以英文提交。本地化的网站页面仅为方便用户而提供，并不表示 Taskivator 会以所列出的每种语言提供支持。","ru":"Обращения в поддержку необходимо отправлять на английском языке. Локализованные страницы сайта предоставляются для удобства и не означают, что Taskivator оказывает поддержку на всех перечисленных языках."};
for(const c in i18n){ if(i18n[c]&&i18n[c].docPages) i18n[c].docPages.englishOnly=supportEnglishOnly[c]||supportEnglishOnly.en; }

/* === localized accessibility (aria) labels === */
// Screen-reader-only strings applied via data-t-aria: landmark names for the
// site/footer navigation, the menu/language controls, and accessible names for
// the three silent demo videos (muted visual loops — captions not applicable).
const a11yL10n={
  ar: {linkedin:"BugIt على LinkedIn (يفتح في تبويب جديد)",youtube:"BugIt على YouTube (يفتح في تبويب جديد)",
  openMenu: "فتح القائمة",
  closeMenu: "إغلاق القائمة",
  language: "اللغة",
  siteNav: "التنقل في الموقع",
  footerNav: "التنقل في التذييل",
  home: "الصفحة الرئيسية لـ BugIt",
  demoCore:'فيديو توضيحي: سير عمل BugIt الأساسي من الملاحظة إلى التذكرة',demoSaas: "فيديو توضيحي: BugIt في سير عمل ضمان جودة تطبيق ويب SaaS",
  demoGame: "فيديو توضيحي: BugIt في سير عمل ضمان جودة الألعاب",
  demoMobile: "فيديو توضيحي: BugIt في سير عمل ضمان جودة تطبيق الجوال"
,skipToContent:"تخطَّ إلى المحتوى",demoTabs:"اختيار عرض توضيحي"},
 ja:{linkedin:"LinkedInのBugIt（新しいタブで開きます）",youtube:"YouTubeのBugIt（新しいタブで開きます）",openMenu:'メニューを開く',closeMenu:'メニューを閉じる',language:'言語',siteNav:'サイトナビゲーション',footerNav:'フッターナビゲーション',home:'BugIt ホーム',demoCore:'デモ動画：メモから起票までのBugItの基本ワークフロー',demoSaas:'デモ動画：SaaS / WebアプリのQAワークフローで動くBugIt',demoGame:'デモ動画：ゲームQAワークフローで動くBugIt',demoMobile:'デモ動画：モバイルアプリのQAワークフローで動くBugIt',skipToContent:"コンテンツへスキップ",demoTabs:"デモを選択"},
 de:{linkedin:"BugIt auf LinkedIn (wird in einem neuen Tab geöffnet)",youtube:"BugIt auf YouTube (wird in einem neuen Tab geöffnet)",openMenu:'Menü öffnen',closeMenu:'Menü schließen',language:'Sprache',siteNav:'Hauptnavigation',footerNav:'Fußzeilennavigation',home:'BugIt Startseite',demoCore:'Demovideo: BugIts Kern-Workflow, von der Notiz bis zum Ticket',demoSaas:'Demovideo: BugIt im QA-Workflow einer SaaS-Web-App',demoGame:'Demovideo: BugIt im Spiele-QA-Workflow',demoMobile:'Demovideo: BugIt im QA-Workflow einer Mobile-App',skipToContent:"Zum Inhalt springen",demoTabs:"Demo auswählen"},
 fr:{linkedin:"BugIt sur LinkedIn (ouvre un nouvel onglet)",youtube:"BugIt sur YouTube (ouvre un nouvel onglet)",openMenu:'Ouvrir le menu',closeMenu:'Fermer le menu',language:'Langue',siteNav:'Navigation du site',footerNav:'Navigation du pied de page',home:'Accueil BugIt',demoCore:'Vidéo de démo : le workflow principal de BugIt, de la note au ticket',demoSaas:'Vidéo de démo : BugIt dans un workflow QA d’application web SaaS',demoGame:'Vidéo de démo : BugIt dans un workflow QA de jeu vidéo',demoMobile:'Vidéo de démo : BugIt dans un workflow QA d’application mobile',skipToContent:"Aller au contenu",demoTabs:"Choisir une démo"},
 es:{linkedin:"BugIt en LinkedIn (se abre en una pestaña nueva)",youtube:"BugIt en YouTube (se abre en una pestaña nueva)",openMenu:'Abrir menú',closeMenu:'Cerrar menú',language:'Idioma',siteNav:'Navegación del sitio',footerNav:'Navegación del pie de página',home:'Inicio de BugIt',demoCore:'Vídeo de demostración: el flujo principal de BugIt, de la nota al ticket',demoSaas:'Vídeo de demostración: BugIt en un flujo de QA de una aplicación web SaaS',demoGame:'Vídeo de demostración: BugIt en un flujo de QA de videojuegos',demoMobile:'Vídeo de demostración: BugIt en un flujo de QA de una app móvil',skipToContent:"Ir al contenido",demoTabs:"Elegir una demostración"},
 'pt-br':{linkedin:"BugIt no LinkedIn (abre em uma nova aba)",youtube:"BugIt no YouTube (abre em uma nova aba)",openMenu:'Abrir menu',closeMenu:'Fechar menu',language:'Idioma',siteNav:'Navegação do site',footerNav:'Navegação do rodapé',home:'Página inicial do BugIt',demoCore:'Vídeo de demonstração: o fluxo principal do BugIt, da nota ao ticket',demoSaas:'Vídeo de demonstração: BugIt em um fluxo de QA de aplicativo web SaaS',demoGame:'Vídeo de demonstração: BugIt em um fluxo de QA de jogos',demoMobile:'Vídeo de demonstração: BugIt em um fluxo de QA de aplicativo mobile',skipToContent:"Ir para o conteúdo",demoTabs:"Escolher uma demonstração"},
 it:{linkedin:"BugIt su LinkedIn (si apre in una nuova scheda)",youtube:"BugIt su YouTube (si apre in una nuova scheda)",openMenu:'Apri il menu',closeMenu:'Chiudi il menu',language:'Lingua',siteNav:'Navigazione del sito',footerNav:'Navigazione a piè di pagina',home:'Home di BugIt',demoCore:'Video dimostrativo: il flusso principale di BugIt, dalla nota al ticket',demoSaas:'Video dimostrativo: BugIt in un flusso QA di una web app SaaS',demoGame:'Video dimostrativo: BugIt in un flusso QA di videogiochi',demoMobile:'Video dimostrativo: BugIt in un flusso QA di app mobile',skipToContent:"Vai al contenuto",demoTabs:"Scegli una demo"},
 ko:{linkedin:"LinkedIn의 BugIt (새 탭에서 열림)",youtube:"YouTube의 BugIt (새 탭에서 열림)",openMenu:'메뉴 열기',closeMenu:'메뉴 닫기',language:'언어',siteNav:'사이트 내비게이션',footerNav:'푸터 내비게이션',home:'BugIt 홈',demoCore:'데모 영상: 메모에서 티켓 등록까지 BugIt의 핵심 워크플로',demoSaas:'데모 영상: SaaS 웹 앱 QA 워크플로에서 동작하는 BugIt',demoGame:'데모 영상: 게임 QA 워크플로에서 동작하는 BugIt',demoMobile:'데모 영상: 모바일 앱 QA 워크플로에서 동작하는 BugIt',skipToContent:"본문으로 건너뛰기",demoTabs:"데모 선택"},
 zh:{linkedin:"LinkedIn 上的 BugIt（在新标签页中打开）",youtube:"YouTube 上的 BugIt（在新标签页中打开）",openMenu:'打开菜单',closeMenu:'关闭菜单',language:'语言',siteNav:'网站导航',footerNav:'页脚导航',home:'BugIt 首页',demoCore:'演示视频：BugIt 从草稿笔记到提交工单的核心工作流',demoSaas:'演示视频：BugIt 在 SaaS 网页应用 QA 工作流中的表现',demoGame:'演示视频：BugIt 在游戏 QA 工作流中的表现',demoMobile:'演示视频：BugIt 在移动应用 QA 工作流中的表现',skipToContent:"跳到主要内容",demoTabs:"选择演示"},
 ru:{linkedin:"BugIt в LinkedIn (откроется в новой вкладке)",youtube:"BugIt в YouTube (откроется в новой вкладке)",openMenu:'Открыть меню',closeMenu:'Закрыть меню',language:'Язык',siteNav:'Навигация по сайту',footerNav:'Навигация в нижней части сайта',home:'Главная BugIt',demoCore:'Демовидео: основной сценарий BugIt, от заметки до созданной задачи',demoSaas:'Демовидео: BugIt в QA-процессе SaaS веб-приложения',demoGame:'Демовидео: BugIt в QA-процессе игры',demoMobile:'Демовидео: BugIt в QA-процессе мобильного приложения',skipToContent:"Перейти к содержимому",demoTabs:"Выбор демонстрации"}
};
for(const c in a11yL10n){ if(i18n[c]) i18n[c].a11y=Object.assign({},i18n.en.a11y,i18n[c].a11y||{},a11yL10n[c]); }
/* The footer's rights line. Applied here for the same reason as the a11y strings above:
   the generated per-locale add() calls merge from the English base, so anything set
   before them is copied back over in English. "(c) 2026 Taskivator." stays literal --
   the year and the company name are not translated -- and only the sentence is. */
const footerL10n={
  ar:'جميع الحقوق محفوظة.',
  ja:'無断複写・転載を禁じます。',
  de:'Alle Rechte vorbehalten.',
  fr:'Tous droits réservés.',
  es:'Todos los derechos reservados.',
  'pt-br':'Todos os direitos reservados.',
  it:'Tutti i diritti riservati.',
  ko:'모든 권리 보유.',
  zh:'版权所有。',
  ru:'Все права защищены.'
};
for(const c in i18n){ i18n[c].footer=Object.assign({},i18n.en.footer,{rights:footerL10n[c]||i18n.en.footer.rights}); }
/* Apply the localized consent-banner dictionary LAST so per-locale copy survives the
   generated locale overrides above (which merge from the English base). */
for(const _c in i18n){ i18n[_c].consent = Object.assign({}, consentI18n.en, consentI18n[_c]||{}); }
/* Same reason, same place: the account menu. Defined near the top of this file but
   applied here, because anything merged from the English base after this point
   would overwrite it. Fall back to English per KEY rather than per LOCALE so a
   locale that only translates some labels keeps the ones it has. */
for(const _c in i18n){ i18n[_c].account = Object.assign({}, accountLabels.en, accountLabels[_c]||{}); }

/* ===== The channel section ==============================================
   Localized copy first, then the player.

   These strings are merged in at the END of this file on purpose. Every locale
   is built with merge(i18n.en, obj), so anything added before the generated
   add() overrides would be rebuilt from the English base and lost. The consent
   banner and the account menu are applied here for the same reason and say so.

   Per KEY fallback rather than per LOCALE: a locale that has only some of these
   keeps the ones it has instead of dropping the whole section to English. */
var watchI18n = {
  en:{eyebrow:'FROM THE CHANNEL',title:'Every part of it, shown rather than claimed.',subtitle:'Short films on each thing BugIt does, from the duplicate check to the confirmation you type. Press play to watch here, or open the channel.',channel:'Open the channel'},
  ja:{eyebrow:'チャンネルから',title:'主張ではなく、動作をご覧ください。',subtitle:'重複チェックから、入力して行う承認まで、BugIt の各機能を短い動画で紹介します。ここで再生するか、チャンネルを開いてください。',channel:'チャンネルを開く'},
  es:{eyebrow:'DEL CANAL',title:'Cada parte, mostrada en lugar de prometida.',subtitle:'Vídeos breves sobre cada cosa que hace BugIt, desde la búsqueda de duplicados hasta la confirmación que escribes. Pulsa reproducir aquí o abre el canal.',channel:'Abrir el canal'},
  fr:{eyebrow:'DE LA CHAÎNE',title:'Chaque partie, montrée plutôt que promise.',subtitle:'Des vidéos courtes sur chaque fonction de BugIt, de la recherche de doublons à la confirmation que vous tapez. Lancez la lecture ici ou ouvrez la chaîne.',channel:'Ouvrir la chaîne'},
  de:{eyebrow:'AUS DEM KANAL',title:'Jeder Teil davon, gezeigt statt behauptet.',subtitle:'Kurze Filme zu allem, was BugIt tut, von der Dublettenprüfung bis zu der Bestätigung, die Sie eintippen. Hier abspielen oder den Kanal öffnen.',channel:'Kanal öffnen'},
  'pt-br':{eyebrow:'DO CANAL',title:'Cada parte, mostrada em vez de prometida.',subtitle:'Vídeos curtos sobre cada coisa que o BugIt faz, da checagem de duplicados à confirmação que você digita. Toque para assistir aqui ou abra o canal.',channel:'Abrir o canal'},
  it:{eyebrow:'DAL CANALE',title:'Ogni parte, mostrata invece che promessa.',subtitle:'Video brevi su tutto ciò che fa BugIt, dal controllo dei duplicati alla conferma che digiti. Premi play per guardarli qui oppure apri il canale.',channel:'Apri il canale'},
  ko:{eyebrow:'채널에서',title:'주장 대신, 실제 동작을 보여 드립니다.',subtitle:'중복 검사부터 직접 입력하는 확인까지, BugIt의 각 기능을 짧은 영상으로 보여 줍니다. 여기서 재생하거나 채널을 열어 보세요.',channel:'채널 열기'},
  zh:{eyebrow:'来自频道',title:'每一项功能，都是演示而非声称。',subtitle:'从重复检查到你亲手输入的确认，用短片展示 BugIt 的每一项功能。在此播放，或打开频道。',channel:'打开频道'},
  ru:{eyebrow:'С КАНАЛА',title:'Каждая часть показана, а не обещана.',subtitle:'Короткие ролики о каждой функции BugIt: от поиска дубликатов до подтверждения, которое вы вводите. Нажмите воспроизведение здесь или откройте канал.',channel:'Открыть канал'},
  ar:{eyebrow:'من القناة',title:'كل جزء منه معروض، لا مجرد وعد.',subtitle:'مقاطع قصيرة عن كل ما يفعله BugIt، من فحص التكرارات إلى التأكيد الذي تكتبه. شغّل المقطع هنا أو افتح القناة.',channel:'افتح القناة'}
};
var watchA11y = {
  en:{playVideo:'Play this video',watchList:'Videos from the BugIt channel',home:'BugIt home'},
  ja:{playVideo:'この動画を再生',watchList:'BugIt チャンネルの動画',home:'BugIt ホーム'},
  es:{playVideo:'Reproducir este vídeo',watchList:'Vídeos del canal de BugIt',home:'Inicio de BugIt'},
  fr:{playVideo:'Lire cette vidéo',watchList:'Vidéos de la chaîne BugIt',home:'Accueil BugIt'},
  de:{playVideo:'Dieses Video abspielen',watchList:'Videos vom BugIt Kanal',home:'BugIt Startseite'},
  'pt-br':{playVideo:'Reproduzir este vídeo',watchList:'Vídeos do canal BugIt',home:'Início do BugIt'},
  it:{playVideo:'Riproduci questo video',watchList:'Video dal canale BugIt',home:'Home di BugIt'},
  ko:{playVideo:'이 영상 재생',watchList:'BugIt 채널의 영상',home:'BugIt 홈'},
  zh:{playVideo:'播放此视频',watchList:'BugIt 频道的视频',home:'BugIt 首页'},
  ru:{playVideo:'Воспроизвести это видео',watchList:'Видео с канала BugIt',home:'Главная BugIt'},
  ar:{playVideo:'تشغيل هذا المقطع',watchList:'مقاطع من قناة BugIt',home:'الصفحة الرئيسية لـ BugIt'}
};
for(var _wc in i18n){
  i18n[_wc].watch = Object.assign({}, watchI18n.en, watchI18n[_wc] || {});
  i18n[_wc].a11y  = Object.assign({}, i18n[_wc].a11y || {}, watchA11y.en, watchA11y[_wc] || {});
}

/* The hero's third action. Merged per KEY into the existing cta namespace at the END of this
   file, for the same reason the channel copy is: every locale is built with merge(i18n.en,
   obj), so a key added before the generated add() overrides is rebuilt from the English base
   and lost. A locale that does not have this one keeps English for this one string only. */
var watchCta = {
  en:{films:'Watch the series'},
  ja:{films:'\u30b7\u30ea\u30fc\u30ba\u3092\u898b\u308b'},
  es:{films:'Ver la serie'},
  fr:{films:'Voir la s\u00e9rie'},
  de:{films:'Die Reihe ansehen'},
  'pt-br':{films:'Ver a s\u00e9rie'},
  it:{films:'Guarda la serie'},
  ko:{films:'\uc2dc\ub9ac\uc988 \ubcf4\uae30'},
  zh:{films:'\u89c2\u770b\u7cfb\u5217\u89c6\u9891'},
  ru:{films:'\u0421\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0441\u0435\u0440\u0438\u044e'},
  ar:{films:'\u0634\u0627\u0647\u062f \u0627\u0644\u0633\u0644\u0633\u0644\u0629'}
};
for(var _cc in i18n){
  i18n[_cc].cta = Object.assign({}, i18n[_cc].cta || {}, watchCta.en, watchCta[_cc] || {});
}

/* The film wall's own copy. Twelve tiles, a name and a line each, and until 2026-08-21
   they were written into index.html in English and rendered in English on all ten
   translated pages. Merged HERE, at the end of the file, for the same reason watchCta
   is: the generated add() overrides above rebuild every locale from the English base,
   so a key added before them is silently replaced by English. BugIt and FILE IT stay
   literal in every language -- the first is the product's name and the second is the
   word the agent matches on, not a word to translate. */
var watchTiles = {
  en:{trailer:{t:'The introduction',sub:'BugIt: a QA agent that writes the bug report for you'},gate:{t:'The FILE IT gate',sub:'Nothing is filed until you type FILE IT'},duplicates:{t:'Duplicate rating',sub:'Is it a duplicate? BugIt gives you a number'},trackers:{t:'Eleven trackers',sub:'Eleven trackers, one workflow: file where your team already works'},pricing:{t:'One price',sub:'A full QA workflow, one price, and it does not renew itself'},quality:{t:'Report quality',sub:'BugIt tells you when your bug report is thin'},housestyle:{t:'Your house style',sub:'Show it one good ticket and it learns your house style'},privacy:{t:'Privacy redaction',sub:'Personal data is stripped before you read the draft'},attachments:{t:'Attachments',sub:'Screenshots, recordings and logs end up on the ticket'},languages:{t:'Your language',sub:'Report in your language, file in the team\'s'},spec:{t:'Reads the spec',sub:'It checks the spec before calling something a bug'},logs:{t:'Crash logs',sub:'Paste the crash log, keep the line that matters'}},
  ja:{trailer:{t:'\u7d39\u4ecb',sub:'BugIt: \u30d0\u30b0\u30ec\u30dd\u30fc\u30c8\u3092\u66f8\u304f QA \u30a8\u30fc\u30b8\u30a7\u30f3\u30c8'},gate:{t:'FILE IT \u30b2\u30fc\u30c8',sub:'FILE IT \u3068\u5165\u529b\u3059\u308b\u307e\u3067\u4f55\u3082\u8d77\u7968\u3055\u308c\u307e\u305b\u3093'},duplicates:{t:'\u91cd\u8907\u30b9\u30b3\u30a2',sub:'\u3053\u308c\u306f\u91cd\u8907\u304b\u3002BugIt \u304c\u6570\u5024\u3067\u793a\u3057\u307e\u3059'},trackers:{t:'11 \u306e\u30c8\u30e9\u30c3\u30ab\u30fc',sub:'11 \u306e\u30c8\u30e9\u30c3\u30ab\u30fc\u30011 \u3064\u306e\u624b\u9806\u3002\u30c1\u30fc\u30e0\u304c\u4eca\u4f7f\u3046\u5834\u6240\u306b\u8d77\u7968\u3057\u307e\u3059'},pricing:{t:'\u4e00\u3064\u306e\u4fa1\u683c',sub:'QA \u306e\u5168\u5de5\u7a0b\u304c\u4e00\u3064\u306e\u4fa1\u683c\u3002\u81ea\u52d5\u66f4\u65b0\u306f\u3042\u308a\u307e\u305b\u3093'},quality:{t:'\u30ec\u30dd\u30fc\u30c8\u54c1\u8cea',sub:'\u5185\u5bb9\u304c\u8584\u3044\u3068\u304d BugIt \u304c\u6307\u6458\u3057\u307e\u3059'},housestyle:{t:'\u30c1\u30fc\u30e0\u306e\u66f8\u5f0f',sub:'\u826f\u3044\u30c1\u30b1\u30c3\u30c8\u3092\u4e00\u4ef6\u898b\u305b\u308c\u3070\u66f8\u5f0f\u3092\u5b66\u3073\u307e\u3059'},privacy:{t:'\u500b\u4eba\u60c5\u5831\u306e\u9664\u53bb',sub:'\u4e0b\u66f8\u304d\u3092\u8aad\u3080\u524d\u306b\u500b\u4eba\u30c7\u30fc\u30bf\u306f\u53d6\u308a\u9664\u304b\u308c\u307e\u3059'},attachments:{t:'\u6dfb\u4ed8\u30d5\u30a1\u30a4\u30eb',sub:'\u30b9\u30af\u30ea\u30fc\u30f3\u30b7\u30e7\u30c3\u30c8\u3001\u9332\u753b\u3001\u30ed\u30b0\u304c\u30c1\u30b1\u30c3\u30c8\u306b\u4ed8\u304d\u307e\u3059'},languages:{t:'\u3042\u306a\u305f\u306e\u8a00\u8a9e',sub:'\u81ea\u5206\u306e\u8a00\u8a9e\u3067\u66f8\u304d\u3001\u30c1\u30fc\u30e0\u306e\u8a00\u8a9e\u3067\u8d77\u7968\u3057\u307e\u3059'},spec:{t:'\u4ed5\u69d8\u3092\u8aad\u3080',sub:'\u4f55\u304b\u3092\u30d0\u30b0\u3068\u547c\u3076\u524d\u306b\u4ed5\u69d8\u3092\u78ba\u8a8d\u3057\u307e\u3059'},logs:{t:'\u30af\u30e9\u30c3\u30b7\u30e5\u30ed\u30b0',sub:'\u30af\u30e9\u30c3\u30b7\u30e5\u30ed\u30b0\u3092\u8cbc\u308c\u3070\u3001\u91cd\u8981\u306a\u884c\u3060\u3051\u304c\u6b8b\u308a\u307e\u3059'}},
  fr:{trailer:{t:'L\'introduction',sub:'BugIt : un agent QA qui r\u00e9dige le rapport de bug \u00e0 votre place'},gate:{t:'La barri\u00e8re FILE IT',sub:'Rien n\'est cr\u00e9\u00e9 tant que vous n\'avez pas tap\u00e9 FILE IT'},duplicates:{t:'Score de doublon',sub:'Est-ce un doublon ? BugIt vous donne un chiffre'},trackers:{t:'Onze outils de suivi',sub:'Onze outils, un seul flux : cr\u00e9ez l\u00e0 o\u00f9 votre \u00e9quipe travaille d\u00e9j\u00e0'},pricing:{t:'Un seul prix',sub:'Un flux QA complet, un seul prix, et sans reconduction automatique'},quality:{t:'Qualit\u00e9 du rapport',sub:'BugIt vous dit quand votre rapport de bug est trop l\u00e9ger'},housestyle:{t:'Votre style maison',sub:'Montrez-lui un bon ticket et il apprend votre style maison'},privacy:{t:'Expurgation des donn\u00e9es',sub:'Les donn\u00e9es personnelles sont retir\u00e9es avant que vous lisiez le brouillon'},attachments:{t:'Pi\u00e8ces jointes',sub:'Captures, enregistrements et journaux finissent sur le ticket'},languages:{t:'Votre langue',sub:'R\u00e9digez dans votre langue, cr\u00e9ez dans celle de l\'\u00e9quipe'},spec:{t:'Il lit la sp\u00e9cification',sub:'Il v\u00e9rifie la sp\u00e9cification avant d\'appeler quelque chose un bug'},logs:{t:'Journaux de plantage',sub:'Collez le journal de plantage, gardez la ligne qui compte'}},
  de:{trailer:{t:'Die Einf\u00fchrung',sub:'BugIt: ein QA-Agent, der den Fehlerbericht f\u00fcr Sie schreibt'},gate:{t:'Das FILE IT-Tor',sub:'Nichts wird angelegt, bis Sie FILE IT eintippen'},duplicates:{t:'Dubletten-Bewertung',sub:'Ist es eine Dublette? BugIt nennt Ihnen eine Zahl'},trackers:{t:'Elf Tracker',sub:'Elf Tracker, ein Ablauf: anlegen, wo Ihr Team schon arbeitet'},pricing:{t:'Ein Preis',sub:'Ein vollst\u00e4ndiger QA-Ablauf, ein Preis, und ohne automatische Verl\u00e4ngerung'},quality:{t:'Berichtsqualit\u00e4t',sub:'BugIt sagt Ihnen, wenn Ihr Fehlerbericht zu d\u00fcnn ist'},housestyle:{t:'Ihr Hausstil',sub:'Zeigen Sie ihm ein gutes Ticket und er lernt Ihren Hausstil'},privacy:{t:'Schw\u00e4rzung',sub:'Personenbezogene Daten werden entfernt, bevor Sie den Entwurf lesen'},attachments:{t:'Anh\u00e4nge',sub:'Screenshots, Aufnahmen und Logs landen am Ticket'},languages:{t:'Ihre Sprache',sub:'Schreiben Sie in Ihrer Sprache, anlegen in der des Teams'},spec:{t:'Liest die Spezifikation',sub:'Es pr\u00fcft die Spezifikation, bevor es etwas einen Fehler nennt'},logs:{t:'Absturzprotokolle',sub:'F\u00fcgen Sie das Absturzprotokoll ein, behalten Sie die Zeile, auf die es ankommt'}},
  es:{trailer:{t:'La introducci\u00f3n',sub:'BugIt: un agente de QA que escribe el informe de error por ti'},gate:{t:'La barrera FILE IT',sub:'No se crea nada hasta que escribes FILE IT'},duplicates:{t:'Puntuaci\u00f3n de duplicados',sub:'\u00bfEs un duplicado? BugIt te da un n\u00famero'},trackers:{t:'Once gestores',sub:'Once gestores, un solo flujo: crea donde tu equipo ya trabaja'},pricing:{t:'Un solo precio',sub:'Un flujo de QA completo, un precio, y no se renueva solo'},quality:{t:'Calidad del informe',sub:'BugIt te avisa cuando tu informe de error es flojo'},housestyle:{t:'Tu estilo de casa',sub:'Mu\u00e9strale un buen ticket y aprende tu estilo de casa'},privacy:{t:'Depuraci\u00f3n de datos',sub:'Los datos personales se eliminan antes de que leas el borrador'},attachments:{t:'Adjuntos',sub:'Capturas, grabaciones y registros acaban en el ticket'},languages:{t:'Tu idioma',sub:'Redacta en tu idioma y crea en el del equipo'},spec:{t:'Lee la especificaci\u00f3n',sub:'Comprueba la especificaci\u00f3n antes de llamar bug a algo'},logs:{t:'Registros de fallos',sub:'Pega el registro del fallo y qu\u00e9date con la l\u00ednea que importa'}},
  'pt-br':{trailer:{t:'A introdu\u00e7\u00e3o',sub:'BugIt: um agente de QA que escreve o relat\u00f3rio de bug para voc\u00ea'},gate:{t:'O port\u00e3o FILE IT',sub:'Nada \u00e9 registrado at\u00e9 voc\u00ea digitar FILE IT'},duplicates:{t:'Nota de duplicidade',sub:'\u00c9 um duplicado? O BugIt te d\u00e1 um n\u00famero'},trackers:{t:'Onze rastreadores',sub:'Onze rastreadores, um s\u00f3 fluxo: registre onde seu time j\u00e1 trabalha'},pricing:{t:'Um pre\u00e7o',sub:'Um fluxo de QA completo, um pre\u00e7o, e sem renova\u00e7\u00e3o autom\u00e1tica'},quality:{t:'Qualidade do relat\u00f3rio',sub:'O BugIt avisa quando seu relat\u00f3rio de bug est\u00e1 fraco'},housestyle:{t:'O estilo da sua casa',sub:'Mostre um bom chamado e ele aprende o estilo da sua casa'},privacy:{t:'Remo\u00e7\u00e3o de dados pessoais',sub:'Os dados pessoais saem antes de voc\u00ea ler o rascunho'},attachments:{t:'Anexos',sub:'Capturas, grava\u00e7\u00f5es e logs v\u00e3o parar no chamado'},languages:{t:'Seu idioma',sub:'Escreva no seu idioma e registre no do time'},spec:{t:'L\u00ea a especifica\u00e7\u00e3o',sub:'Ele confere a especifica\u00e7\u00e3o antes de chamar algo de bug'},logs:{t:'Logs de falha',sub:'Cole o log da falha e fique com a linha que importa'}},
  it:{trailer:{t:'L\'introduzione',sub:'BugIt: un agente QA che scrive il report del bug al posto tuo'},gate:{t:'Il varco FILE IT',sub:'Non viene creato nulla finch\u00e9 non digiti FILE IT'},duplicates:{t:'Punteggio duplicati',sub:'\u00c8 un duplicato? BugIt ti d\u00e0 un numero'},trackers:{t:'Undici tracker',sub:'Undici tracker, un solo flusso: apri dove il tuo team gi\u00e0 lavora'},pricing:{t:'Un solo prezzo',sub:'Un flusso QA completo, un prezzo, e senza rinnovo automatico'},quality:{t:'Qualit\u00e0 del report',sub:'BugIt ti avvisa quando il report del bug \u00e8 povero'},housestyle:{t:'Il tuo stile interno',sub:'Mostragli un buon ticket e impara il tuo stile interno'},privacy:{t:'Rimozione dei dati personali',sub:'I dati personali vengono rimossi prima che tu legga la bozza'},attachments:{t:'Allegati',sub:'Screenshot, registrazioni e log finiscono sul ticket'},languages:{t:'La tua lingua',sub:'Scrivi nella tua lingua, apri in quella del team'},spec:{t:'Legge le specifiche',sub:'Controlla le specifiche prima di chiamare bug qualcosa'},logs:{t:'Log dei crash',sub:'Incolla il log del crash, tieni la riga che conta'}},
  ko:{trailer:{t:'\uc18c\uac1c',sub:'BugIt: \ubc84\uadf8 \ub9ac\ud3ec\ud2b8\ub97c \ub300\uc2e0 \uc791\uc131\ud558\ub294 QA \uc5d0\uc774\uc804\ud2b8'},gate:{t:'FILE IT \uad00\ubb38',sub:'FILE IT \uc744 \uc785\ub825\ud558\uae30 \uc804\uc5d0\ub294 \uc544\ubb34\uac83\ub3c4 \ub4f1\ub85d\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4'},duplicates:{t:'\uc911\ubcf5 \uc810\uc218',sub:'\uc911\ubcf5\uc77c\uae4c\uc694? BugIt\uc774 \uc22b\uc790\ub85c \uc54c\ub824 \uc90d\ub2c8\ub2e4'},trackers:{t:'11\uac1c \ud2b8\ub798\ucee4',sub:'\ud2b8\ub798\ucee4 11\uac1c, \ud558\ub098\uc758 \ud750\ub984. \ud300\uc774 \uc774\ubbf8 \uc4f0\ub294 \uacf3\uc5d0 \ub4f1\ub85d\ud569\ub2c8\ub2e4'},pricing:{t:'\ud558\ub098\uc758 \uac00\uaca9',sub:'QA \uc804 \uacfc\uc815\uc774 \ud558\ub098\uc758 \uac00\uaca9. \uc790\ub3d9 \uac31\uc2e0\uc740 \uc5c6\uc2b5\ub2c8\ub2e4'},quality:{t:'\ub9ac\ud3ec\ud2b8 \ud488\uc9c8',sub:'\ub0b4\uc6a9\uc774 \ubd80\uc2e4\ud558\uba74 BugIt\uc774 \uc54c\ub824 \uc90d\ub2c8\ub2e4'},housestyle:{t:'\ud300\uc758 \uc791\uc131 \ubc29\uc2dd',sub:'\uc88b\uc740 \ud2f0\ucf13 \ud558\ub098\ub97c \ubcf4\uc5ec \uc8fc\uba74 \ud300\uc758 \ubc29\uc2dd\uc744 \ubc30\uc6c1\ub2c8\ub2e4'},privacy:{t:'\uac1c\uc778\uc815\ubcf4 \uc81c\uac70',sub:'\ucd08\uc548\uc744 \uc77d\uae30 \uc804\uc5d0 \uac1c\uc778 \ub370\uc774\ud130\uac00 \uc81c\uac70\ub429\ub2c8\ub2e4'},attachments:{t:'\ucca8\ubd80 \ud30c\uc77c',sub:'\uc2a4\ud06c\ub9b0\uc0f7, \ub179\ud654, \ub85c\uadf8\uac00 \ud2f0\ucf13\uc5d0 \ud568\uaed8 \uc62c\ub77c\uac11\ub2c8\ub2e4'},languages:{t:'\ub0b4 \uc5b8\uc5b4',sub:'\ub0b4 \uc5b8\uc5b4\ub85c \uc791\uc131\ud558\uace0 \ud300\uc758 \uc5b8\uc5b4\ub85c \ub4f1\ub85d\ud569\ub2c8\ub2e4'},spec:{t:'\uba85\uc138\ub97c \uc77d\uc2b5\ub2c8\ub2e4',sub:'\ubb34\uc5b8\uac00\ub97c \ubc84\uadf8\ub77c \ubd80\ub974\uae30 \uc804\uc5d0 \uba85\uc138\ub97c \ud655\uc778\ud569\ub2c8\ub2e4'},logs:{t:'\ud06c\ub798\uc2dc \ub85c\uadf8',sub:'\ud06c\ub798\uc2dc \ub85c\uadf8\ub97c \ubd99\uc5ec \ub123\uc73c\uba74 \uc911\uc694\ud55c \uc904\ub9cc \ub0a8\uc2b5\ub2c8\ub2e4'}},
  zh:{trailer:{t:'\u4ea7\u54c1\u4ecb\u7ecd',sub:'BugIt\uff1a\u66ff\u4f60\u5199\u597d\u7f3a\u9677\u62a5\u544a\u7684 QA \u667a\u80fd\u4f53'},gate:{t:'FILE IT \u5173\u5361',sub:'\u5728\u4f60\u8f93\u5165 FILE IT \u4e4b\u524d\uff0c\u4e0d\u4f1a\u63d0\u4ea4\u4efb\u4f55\u5185\u5bb9'},duplicates:{t:'\u91cd\u590d\u5ea6\u8bc4\u5206',sub:'\u662f\u91cd\u590d\u95ee\u9898\u5417\uff1fBugIt \u7ed9\u4f60\u4e00\u4e2a\u5206\u6570'},trackers:{t:'\u5341\u4e00\u79cd\u7f3a\u9677\u7cfb\u7edf',sub:'\u5341\u4e00\u79cd\u7cfb\u7edf\uff0c\u4e00\u5957\u6d41\u7a0b\uff1a\u63d0\u4ea4\u5230\u56e2\u961f\u5df2\u7ecf\u5728\u7528\u7684\u5730\u65b9'},pricing:{t:'\u4e00\u6b21\u5b9a\u4ef7',sub:'\u5b8c\u6574\u7684 QA \u6d41\u7a0b\uff0c\u4e00\u6b21\u5b9a\u4ef7\uff0c\u4e0d\u4f1a\u81ea\u52a8\u7eed\u8d39'},quality:{t:'\u62a5\u544a\u8d28\u91cf',sub:'\u62a5\u544a\u5185\u5bb9\u592a\u5355\u8584\u65f6\uff0cBugIt \u4f1a\u544a\u8bc9\u4f60'},housestyle:{t:'\u4f60\u4eec\u7684\u5199\u6cd5',sub:'\u7ed9\u5b83\u770b\u4e00\u4e2a\u597d\u5de5\u5355\uff0c\u5b83\u5c31\u5b66\u4f1a\u4f60\u4eec\u7684\u5199\u6cd5'},privacy:{t:'\u9690\u79c1\u8131\u654f',sub:'\u4f60\u8bfb\u5230\u8349\u7a3f\u4e4b\u524d\uff0c\u4e2a\u4eba\u6570\u636e\u5df2\u88ab\u79fb\u9664'},attachments:{t:'\u9644\u4ef6',sub:'\u622a\u56fe\u3001\u5f55\u5c4f\u548c\u65e5\u5fd7\u90fd\u4f1a\u9644\u5230\u5de5\u5355\u4e0a'},languages:{t:'\u4f60\u7684\u8bed\u8a00',sub:'\u7528\u4f60\u7684\u8bed\u8a00\u64b0\u5199\uff0c\u7528\u56e2\u961f\u7684\u8bed\u8a00\u63d0\u4ea4'},spec:{t:'\u4f1a\u770b\u9700\u6c42\u6587\u6863',sub:'\u5728\u628a\u67d0\u4ef6\u4e8b\u79f0\u4e3a\u7f3a\u9677\u4e4b\u524d\uff0c\u5b83\u5148\u6838\u5bf9\u9700\u6c42'},logs:{t:'\u5d29\u6e83\u65e5\u5fd7',sub:'\u7c98\u8d34\u5d29\u6e83\u65e5\u5fd7\uff0c\u7559\u4e0b\u771f\u6b63\u91cd\u8981\u7684\u90a3\u4e00\u884c'}},
  ru:{trailer:{t:'\u0417\u043d\u0430\u043a\u043e\u043c\u0441\u0442\u0432\u043e',sub:'BugIt: QA-\u0430\u0433\u0435\u043d\u0442, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043f\u0438\u0448\u0435\u0442 \u043e\u0442\u0447\u0451\u0442 \u043e\u0431 \u043e\u0448\u0438\u0431\u043a\u0435 \u0437\u0430 \u0432\u0430\u0441'},gate:{t:'\u0411\u0430\u0440\u044c\u0435\u0440 FILE IT',sub:'\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u0451\u0442\u0441\u044f, \u043f\u043e\u043a\u0430 \u0432\u044b \u043d\u0435 \u043d\u0430\u0431\u0435\u0440\u0451\u0442\u0435 FILE IT'},duplicates:{t:'\u041e\u0446\u0435\u043d\u043a\u0430 \u0434\u0443\u0431\u043b\u0438\u043a\u0430\u0442\u0430',sub:'\u042d\u0442\u043e \u0434\u0443\u0431\u043b\u0438\u043a\u0430\u0442? BugIt \u0434\u0430\u0451\u0442 \u0447\u0438\u0441\u043b\u043e'},trackers:{t:'\u041e\u0434\u0438\u043d\u043d\u0430\u0434\u0446\u0430\u0442\u044c \u0442\u0440\u0435\u043a\u0435\u0440\u043e\u0432',sub:'\u041e\u0434\u0438\u043d\u043d\u0430\u0434\u0446\u0430\u0442\u044c \u0442\u0440\u0435\u043a\u0435\u0440\u043e\u0432, \u043e\u0434\u0438\u043d \u043f\u0440\u043e\u0446\u0435\u0441\u0441: \u0437\u0430\u0432\u043e\u0434\u0438\u0442\u0435 \u0442\u0430\u043c, \u0433\u0434\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u0443\u0436\u0435 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442'},pricing:{t:'\u041e\u0434\u043d\u0430 \u0446\u0435\u043d\u0430',sub:'\u041f\u043e\u043b\u043d\u044b\u0439 \u043f\u0440\u043e\u0446\u0435\u0441\u0441 QA, \u043e\u0434\u043d\u0430 \u0446\u0435\u043d\u0430, \u0438 \u0431\u0435\u0437 \u0430\u0432\u0442\u043e\u043f\u0440\u043e\u0434\u043b\u0435\u043d\u0438\u044f'},quality:{t:'\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e \u043e\u0442\u0447\u0451\u0442\u0430',sub:'BugIt \u043f\u043e\u0434\u0441\u043a\u0430\u0436\u0435\u0442, \u043a\u043e\u0433\u0434\u0430 \u043e\u0442\u0447\u0451\u0442 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0441\u043a\u0443\u043f\u043e\u0439'},housestyle:{t:'\u0412\u0430\u0448 \u0441\u0442\u0438\u043b\u044c \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u0438\u044f',sub:'\u041f\u043e\u043a\u0430\u0436\u0438\u0442\u0435 \u043e\u0434\u0438\u043d \u0445\u043e\u0440\u043e\u0448\u0438\u0439 \u0442\u0438\u043a\u0435\u0442, \u0438 \u043e\u043d \u0443\u0441\u0432\u043e\u0438\u0442 \u0432\u0430\u0448 \u0441\u0442\u0438\u043b\u044c'},privacy:{t:'\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445',sub:'\u041f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0443\u0431\u0438\u0440\u0430\u044e\u0442\u0441\u044f \u0434\u043e \u0442\u043e\u0433\u043e, \u043a\u0430\u043a \u0432\u044b \u043f\u0440\u043e\u0447\u0442\u0451\u0442\u0435 \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a'},attachments:{t:'\u0412\u043b\u043e\u0436\u0435\u043d\u0438\u044f',sub:'\u0421\u043a\u0440\u0438\u043d\u0448\u043e\u0442\u044b, \u0437\u0430\u043f\u0438\u0441\u0438 \u0438 \u0436\u0443\u0440\u043d\u0430\u043b\u044b \u043f\u043e\u043f\u0430\u0434\u0430\u044e\u0442 \u0432 \u0442\u0438\u043a\u0435\u0442'},languages:{t:'\u0412\u0430\u0448 \u044f\u0437\u044b\u043a',sub:'\u041f\u0438\u0448\u0438\u0442\u0435 \u043d\u0430 \u0441\u0432\u043e\u0451\u043c \u044f\u0437\u044b\u043a\u0435, \u0437\u0430\u0432\u043e\u0434\u0438\u0442\u0435 \u043d\u0430 \u044f\u0437\u044b\u043a\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u044b'},spec:{t:'\u0427\u0438\u0442\u0430\u0435\u0442 \u0441\u043f\u0435\u0446\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044e',sub:'\u041e\u043d \u0441\u0432\u0435\u0440\u044f\u0435\u0442\u0441\u044f \u0441\u043e \u0441\u043f\u0435\u0446\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0435\u0439, \u043f\u0440\u0435\u0436\u0434\u0435 \u0447\u0435\u043c \u043d\u0430\u0437\u0432\u0430\u0442\u044c \u0447\u0442\u043e-\u0442\u043e \u0431\u0430\u0433\u043e\u043c'},logs:{t:'\u0416\u0443\u0440\u043d\u0430\u043b\u044b \u0441\u0431\u043e\u0435\u0432',sub:'\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0436\u0443\u0440\u043d\u0430\u043b \u0441\u0431\u043e\u044f \u0438 \u043e\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0441\u0442\u0440\u043e\u043a\u0443, \u043a\u043e\u0442\u043e\u0440\u0430\u044f \u0432\u0430\u0436\u043d\u0430'}},
  ar:{trailer:{t:'\u0627\u0644\u0645\u0642\u062f\u0645\u0629',sub:'BugIt: \u0648\u0643\u064a\u0644 \u0636\u0645\u0627\u0646 \u062c\u0648\u062f\u0629 \u064a\u0643\u062a\u0628 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062e\u0637\u0623 \u0646\u064a\u0627\u0628\u0629 \u0639\u0646\u0643'},gate:{t:'\u0628\u0648\u0627\u0628\u0629 FILE IT',sub:'\u0644\u0627 \u064a\u064f\u0633\u062c\u064e\u0651\u0644 \u0623\u064a \u0634\u064a\u0621 \u062d\u062a\u0649 \u062a\u0643\u062a\u0628 FILE IT'},duplicates:{t:'\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u062a\u0643\u0631\u0627\u0631',sub:'\u0647\u0644 \u0647\u0648 \u062a\u0643\u0631\u0627\u0631\u061f \u064a\u0639\u0637\u064a\u0643 BugIt \u0631\u0642\u0645\u064b\u0627'},trackers:{t:'\u0623\u062d\u062f \u0639\u0634\u0631 \u0645\u062a\u062a\u0628\u0639\u064b\u0627',sub:'\u0623\u062d\u062f \u0639\u0634\u0631 \u0645\u062a\u062a\u0628\u0639\u064b\u0627 \u0648\u0633\u064a\u0631 \u0639\u0645\u0644 \u0648\u0627\u062d\u062f: \u0633\u062c\u0651\u0644 \u062d\u064a\u062b \u064a\u0639\u0645\u0644 \u0641\u0631\u064a\u0642\u0643 \u0628\u0627\u0644\u0641\u0639\u0644'},pricing:{t:'\u0633\u0639\u0631 \u0648\u0627\u062d\u062f',sub:'\u0633\u064a\u0631 \u0639\u0645\u0644 \u0636\u0645\u0627\u0646 \u062c\u0648\u062f\u0629 \u0643\u0627\u0645\u0644 \u0628\u0633\u0639\u0631 \u0648\u0627\u062d\u062f\u060c \u0648\u062f\u0648\u0646 \u062a\u062c\u062f\u064a\u062f \u062a\u0644\u0642\u0627\u0626\u064a'},quality:{t:'\u062c\u0648\u062f\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631',sub:'\u064a\u062e\u0628\u0631\u0643 BugIt \u0639\u0646\u062f\u0645\u0627 \u064a\u0643\u0648\u0646 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062e\u0637\u0623 \u0636\u0639\u064a\u0641\u064b\u0627'},housestyle:{t:'\u0623\u0633\u0644\u0648\u0628 \u0641\u0631\u064a\u0642\u0643',sub:'\u0627\u0639\u0631\u0636 \u0639\u0644\u064a\u0647 \u062a\u0630\u0643\u0631\u0629 \u062c\u064a\u062f\u0629 \u0648\u0627\u062d\u062f\u0629 \u0641\u064a\u062a\u0639\u0644\u0651\u0645 \u0623\u0633\u0644\u0648\u0628 \u0641\u0631\u064a\u0642\u0643'},privacy:{t:'\u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629',sub:'\u062a\u064f\u0632\u0627\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0642\u0628\u0644 \u0623\u0646 \u062a\u0642\u0631\u0623 \u0627\u0644\u0645\u0633\u0648\u062f\u0629'},attachments:{t:'\u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a',sub:'\u062a\u0635\u0644 \u0644\u0642\u0637\u0627\u062a \u0627\u0644\u0634\u0627\u0634\u0629 \u0648\u0627\u0644\u062a\u0633\u062c\u064a\u0644\u0627\u062a \u0648\u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0625\u0644\u0649 \u0627\u0644\u062a\u0630\u0643\u0631\u0629'},languages:{t:'\u0644\u063a\u062a\u0643',sub:'\u0627\u0643\u062a\u0628 \u0628\u0644\u063a\u062a\u0643 \u0648\u0633\u062c\u0651\u0644 \u0628\u0644\u063a\u0629 \u0627\u0644\u0641\u0631\u064a\u0642'},spec:{t:'\u064a\u0642\u0631\u0623 \u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062a',sub:'\u064a\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062a \u0642\u0628\u0644 \u0623\u0646 \u064a\u0635\u0641 \u0634\u064a\u0626\u064b\u0627 \u0628\u0623\u0646\u0647 \u062e\u0637\u0623'},logs:{t:'\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0623\u0639\u0637\u0627\u0644',sub:'\u0627\u0644\u0635\u0642 \u0633\u062c\u0644 \u0627\u0644\u0639\u0637\u0644 \u0648\u0627\u062d\u062a\u0641\u0638 \u0628\u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u0645\u0647\u0645'}}
};
for(var _wt in i18n){
  i18n[_wt].watchTiles = Object.assign({}, watchTiles.en, watchTiles[_wt] || {});
}

/* Two strings that rendered in English on a translated page until 2026-08-21, both found
   by reading the page rather than the dictionary.

   faqMoreLabel carried ten locales and not ar, so the Arabic homepage showed the English
   link. A missing key falls back to English by design, which is why nothing failed.

   demo.saas was a LITERAL inside makeLang -- `saas:'SaaS / Web App'` -- while every tab
   beside it came from the locale's own array. So an English tab sat between three
   translated ones. "SaaS" itself stays Latin everywhere: it is a term of art and it is
   what the people buying this call it.

   Merged HERE for the reason recorded above watchCta and accountLabels: the generated
   add() overrides further up rebuild every locale from the English base, so anything
   added before them is quietly replaced by English. Four separate additions to this file
   have now been caught by that. */
var lateLabels = {
  en:{saas:'SaaS / Web App'},
  ja:{saas:'SaaS / Web\u30a2\u30d7\u30ea'},
  fr:{saas:'SaaS / Application web'},
  de:{saas:'SaaS / Web-App'},
  es:{saas:'SaaS / App web'},
  'pt-br':{saas:'SaaS / App web'},
  it:{saas:'SaaS / App web'},
  ko:{saas:'SaaS / \uc6f9 \uc571'},
  zh:{saas:'SaaS / \u7f51\u9875\u5e94\u7528'},
  ru:{saas:'SaaS / \u0412\u0435\u0431-\u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435'},
  ar:{saas:'SaaS / \u062a\u0637\u0628\u064a\u0642 \u0648\u064a\u0628',faqMore:'\u0639\u0631\u0636 \u062c\u0645\u064a\u0639 \u0627\u0644\u0623\u0633\u0626\u0644\u0629'}
};
for(var _ll2 in i18n){
  var _lab = lateLabels[_ll2] || {};
  if(i18n[_ll2].demo && _lab.saas) i18n[_ll2].demo.saas = _lab.saas;
}
/* faqMoreLabel is consumed by renderFaq(), not by the i18n object, so it is topped up in
   place rather than merged. */
if(typeof faqMoreLabel !== 'undefined'){
  if(!faqMoreLabel['ar']) faqMoreLabel['ar'] = '\u0639\u0631\u0636 \u062c\u0645\u064a\u0639 \u0627\u0644\u0623\u0633\u0626\u0644\u0629';
}

/* The player is a FACADE, and that is a privacy decision rather than a performance one.
   A plain <iframe src="youtube.com/..."> reaches Google on every page load, for every
   visitor, before the consent banner has been answered. scripts/check-consent-network.mjs
   asserts that this site makes zero Google requests before consent, so an always-on embed
   would not only break a promise made in the privacy policy, it would fail the build.

   So the page ships a local poster and creates the embed only in response to a press. The
   host is youtube-nocookie.com, YouTube's privacy enhanced player, and it is the only
   frame-src the Content-Security-Policy grants. Twelve live embeds would also have been
   twelve player bundles on a page that currently loads none. */
(function(){
  var stage = document.getElementById('ytStage');
  if(!stage) return;
  var poster = document.getElementById('ytPoster'),
      posterTall = document.getElementById('ytPosterTall'),
      label  = document.getElementById('ytLabel'),
      title  = document.getElementById('ytTitle'),
      dur    = document.getElementById('ytDur'),
      play   = document.getElementById('ytPlay'),
      list   = document.getElementById('ytList'),
      meta   = stage.querySelector('.yt-stage-meta'),
      current = list.querySelector('.yt-item[aria-current="true"]') || list.querySelector('.yt-item'),
      section = stage.closest('.watch') || stage;

  /* The one place the two cuts are chosen between. 760px is the site's phone breakpoint and
     the same one <source media> uses on the poster, so the frame on screen and the video that
     replaces it are always the same shape. matchMedia rather than a resize handler: no
     listener runs while nobody is resizing. */
  var phone = window.matchMedia ? window.matchMedia('(max-width: 760px)') : {matches:false};
  function cutOf(el){ return (phone.matches ? el.dataset.tall : el.dataset.wide) || el.dataset.wide; }

  /* mm:ss (or h:mm:ss) as seconds. The duration is authored, so this is parsing our own
     data rather than anything a viewer can influence. */
  function secondsOf(text){
    var parts = String(text || '').trim().split(':').map(Number);
    if(!parts.length || parts.some(isNaN)) return 0;
    return parts.reduce(function(total, n){ return total * 60 + n; }, 0);
  }
  function armRing(){
    var secs = secondsOf(dur.textContent);
    section.style.setProperty('--yt-run', (secs > 0 ? secs : 0) + 's');
    stage.classList.remove('is-done');
    /* Restart the fill from zero for THIS film. Re-setting the duration alone would let a
       finished animation stay finished, so the ring would open full. */
    stage.classList.remove('is-timed');
    void stage.offsetWidth;
    if(secs > 0) stage.classList.add('is-timed');
  }
  function syncRing(seconds){
    if(typeof seconds !== 'number' || !isFinite(seconds)) return;
    (section.getAnimations ? section.getAnimations() : []).forEach(function(a){
      /* Only nudge it when it has actually drifted: writing currentTime on every message
         would restart the compositor's work several times a second for no visible gain. */
      if(Math.abs((a.currentTime || 0) - seconds * 1000) > 900) a.currentTime = seconds * 1000;
    });
  }
  function stop(){
    var f = stage.querySelector('iframe');
    if(f) f.remove();
    stage.classList.remove('is-playing','is-live','is-timed','is-done','is-held');
    section.style.removeProperty('--yt-run');
    if(poster.parentNode) poster.parentNode.hidden = false;
    play.hidden = false; meta.hidden = false;
  }
  function start(){
    if(stage.querySelector('iframe')) return;
    var f = document.createElement('iframe');
    /* encodeURIComponent even though every id here is authored: the id is read back out
       of the DOM, and a value that reaches a URL should be encoded where it is used, not
       where it happened to come from. */
    /* cc_load_policy=0 asks the player not to turn captions on by default, and
       iv_load_policy=3 removes the old annotation layer. Neither can override a viewer who
       has captions forced on in their own YouTube account, and neither touches text that was
       rendered INTO the film: those are the upload's, not the page's. */
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(cutOf(stage)) +
            '?autoplay=1&rel=0&modestbranding=1&playsinline=1&cc_load_policy=0&iv_load_policy=3' +
            '&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
    f.title = title.textContent;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.setAttribute('allowfullscreen','');
    f.setAttribute('loading','lazy');
    stage.appendChild(f);
    stage.classList.add('is-playing');
    armRing();
    /* Ask the player to report its state. This is a postMessage to a frame that is already
       on the page, not a request: nothing new is fetched, and nothing happens at all until
       somebody has pressed play. */
    f.addEventListener('load', function(){
      try{
        f.contentWindow.postMessage(
          JSON.stringify({event:'listening', id:1, channel:'widget'}),
          'https://www.youtube-nocookie.com');
      }catch(e){}
    });
    if(poster.parentNode) poster.parentNode.hidden = true;
    play.hidden = true; meta.hidden = true;
  }
  function select(btn){
    var playing = !!stage.querySelector('iframe');
    stop();
    current = btn;
    stage.dataset.wide = btn.dataset.wide;
    stage.dataset.tall = btn.dataset.tall;
    stage.dataset.id   = cutOf(btn);
    /* Both sources are set. Writing only img.src would leave the phone showing the previous
       film's vertical poster, because a <source> that still matches keeps winning. */
    if(posterTall) posterTall.srcset = btn.dataset.posterTall;
    poster.src = btn.dataset.posterWide;
    if(label) label.textContent = btn.querySelector('.yt-t').textContent;
    /* The subtitle IS the stage's title, and it is the LOCALIZED one. data-title was a
       second copy of the same sentence in the markup, which is a second thing to keep
       translated and a second thing to forget; it stays as the fallback only. */
    var _sub = btn.querySelector('.yt-sub');
    title.textContent = (_sub && _sub.textContent) || btn.dataset.title || '';
    /* The stage OPENS on the trailer, so its label and title carry the trailer's translation
       keys in the markup -- that is what makes the first paint localized rather than English.
       The moment another film is chosen those keys are a lie, and applyLang() would put the
       trailer's words back on the next language change. Take them off, and re-point them at
       the film now showing so a language change still reaches the stage. */
    if(label){label.dataset.t=btn.querySelector('.yt-t').dataset.t||'';}
    if(_sub&&_sub.dataset.t){title.dataset.t=_sub.dataset.t;}else{delete title.dataset.t;}
    dur.textContent = btn.dataset.dur;
    var all = list.querySelectorAll('.yt-item');
    for(var i=0;i<all.length;i++){
      if(all[i] === btn) all[i].setAttribute('aria-current','true');
      else all[i].removeAttribute('aria-current');
    }
    /* Choosing another film while one is playing keeps playing. Dropping back to a poster
       there would read as the click having failed. */
    if(playing) start();
  }
  /* Rotating a tablet, or dragging a desktop window narrow, changes which cut is correct.
     Only the id is refreshed, and only while nothing is playing: swapping the src under a
     running player would restart it from zero. */
  function onBreak(){
    if(stage.querySelector('iframe')) return;
    stage.dataset.id = cutOf(stage);
  }
  if(phone.addEventListener) phone.addEventListener('change', onBreak);
  else if(phone.addListener) phone.addListener(onBreak);
  stage.dataset.id = cutOf(stage);

  /* The player's own state, read from the message it sends back. Origin-checked, because a
     message handler that trusts any sender is a message handler that can be driven by any
     page that manages to open a frame here. -1 unstarted, 0 ended, 1 playing, 2 paused,
     3 buffering, 5 cued: only 1 means the film is running. */
  window.addEventListener('message', function(e){
    if(e.origin !== 'https://www.youtube-nocookie.com') return;
    if(!stage.querySelector('iframe')) return;
    var d;
    try{ d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; }catch(err){ return; }
    if(!d || !d.info) return;
    if(typeof d.info === 'object'){
      /* The film's real length, from the film. The manifest gives the ring a duration before
         the player has said anything; this replaces it with the player's own the moment it
         does, so a re-uploaded or slightly different cut can never leave the ring finishing
         early. Only when it actually disagrees -- rewriting the duration restarts the
         animation's timing, so doing it on every message would stutter. */
      if(typeof d.info.duration === 'number' && d.info.duration > 1){
        var want = Math.round(d.info.duration);
        if(Math.abs(want - secondsOf(dur.textContent)) >= 1 &&
           section.style.getPropertyValue('--yt-run') !== want + 's'){
          section.style.setProperty('--yt-run', want + 's');
        }
      }
      if(typeof d.info.currentTime === 'number') syncRing(d.info.currentTime);
    }
    var s = typeof d.info === 'number' ? d.info : d.info.playerState;
    if(typeof s !== 'number') return;
    stage.classList.toggle('is-live', s === 1);
    /* Held, not "not playing": 2 is paused and 3 is buffering, and those are the only two
       states that should stop the ring. If the handshake with the player never completes and
       no state ever arrives, the ring keeps running on the film's own length -- which is
       right, because the film is running too. A ring stopped by silence would be a bug. */
    stage.classList.toggle('is-held', s === 2 || s === 3);
    /* 0 is ended. The ring completes and stays completed, rather than snapping back to empty
       at the exact moment the film finishes. */
    if(s === 0){
      stage.classList.add('is-done');
      /* The tile keeps a completed ring for the rest of the visit: which of twelve films you
         have already seen is worth knowing, and it is the one thing the wall cannot say. */
      if(current) current.classList.add('is-watched');
    }
    if(s === 1) stage.classList.remove('is-done');
  });

  /* ON A PHONE, HAND THE FILM TO YOUTUBE'S OWN PLAYER.
     The stage is the full width of a 390px screen and the wall of films sits under it, so an
     inline play leaves the picture a couple of hundred pixels tall with the rest of the page
     competing for the same screen. Owner, 2026-08-21: "in mobile view when they tap on a
     youtube video becasuse there is not enough space they should be auto taken to the youtube
     video player so they can watch it".
     A youtube.com/watch URL is the deep link both mobile platforms recognise: iOS and Android
     hand it to the installed YouTube app, and fall back to the mobile site when there is none.
     It also starts playing on arrival, which is the second half of the same request.
     `www.youtube.com`, not the nocookie host, because nocookie serves the EMBED player and is
     the frame-src the CSP grants; this is a navigation the reader asked for, not a request this
     page makes, so the no-Google-before-consent promise is untouched. */
  function watchOn(el){
    var id = cutOf(el);
    if(!id) return false;
    window.open('https://www.youtube.com/watch?v=' + encodeURIComponent(id),
                '_blank', 'noopener,noreferrer');
    return true;
  }

  play.addEventListener('click', function(){
    if(phone.matches && watchOn(stage)) return;
    start();
  });
  list.addEventListener('click', function(e){
    var btn = e.target.closest ? e.target.closest('.yt-item') : null;
    if(!btn) return;
    /* Select first either way, so the stage and the wall agree about which film is current
       whichever branch runs and whatever the reader comes back to. */
    select(btn);
    if(phone.matches && watchOn(btn)) return;
    /* A TAP ON A FILM PLAYS IT. It used to only queue it: the poster changed and the reader
       had to find the play button and press a second time, which reads as a dead tap. */
    start();
  });
})();

/* MISSION CONTROL IS ONE BOX ON A PHONE.
   Owner, 2026-08-21: "in mobile view the mission statement is still too large and long and
   taking lots of space you need to come up with a very creative way to make it smaller and
   expandable in just 1 box no need to have 2".

   Stacked on a phone the instrument was two bordered panels: eight status rows, then the
   report. The eight rows are a PROGRESS display -- their value is watching them tick over --
   so hiding them outright would have thrown away the thing that makes the section worth
   scrolling past. Collapsed, the list keeps its LIVE row and drops the other seven, so the
   section still moves while it costs one line instead of eight. Tapping the heading brings the
   rest back.

   The heading is a real <button> at every width rather than a phone-only upgrade, so
   aria-expanded is always telling the truth about a control that always works. On a desktop it
   simply starts expanded. Declaring a state and not honouring it is the defect this site has
   already been caught by twice. */
(function(){
  var btn=document.getElementById('mcStepsToggle');
  var panel=btn&&btn.closest('.status-panel');
  if(!btn||!panel)return;
  var phone=window.matchMedia?window.matchMedia('(max-width:760px)'):{matches:false};
  var set=function(open){
    btn.setAttribute('aria-expanded',open?'true':'false');
    panel.classList.toggle('steps-collapsed',!open);
  };
  /* Default follows the width, and follows it back if the reader rotates the device. A choice
     the reader has made themselves is left alone until the breakpoint is actually crossed. */
  var touched=false;
  var sync=function(){ if(!touched) set(!phone.matches); };
  sync();
  if(phone.addEventListener)phone.addEventListener('change',function(){touched=false;sync()});
  btn.addEventListener('click',function(){
    touched=true;
    set(btn.getAttribute('aria-expanded')!=='true');
  });
})();
