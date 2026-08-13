# بدء الاستخدام مع BugIt

> **تنويه بشأن الترجمة.** تُرجم هذا المستند آليًا ولم يخضع لمراجعة متحدثين أصليين باللغة. النسخة الإنجليزية هي المرجع المعتمد: وعند وجود أي اختلاف يُعتد بالنص الإنجليزي. وللاطلاع على أدق صياغة وأحدثها، يُرجى الرجوع إلى المستند <bdi dir="ltr">الإنجليزي</bdi>.

يحوّل <bdi dir="ltr">BugIt</bdi> ملاحظات الاختبار الأولية إلى تقارير خلل خاضعة للمراجعة داخل <bdi dir="ltr">VS Code</bdi>. يُعد نظام <bdi dir="ltr">Windows 11</bdi> مع <bdi dir="ltr">VS Code</bdi> و<bdi dir="ltr">GitHub Copilot</bdi> المسار المعتمد للإصدار.

## قبل أن تبدأ

- ثبّت أحدث إصدار من <bdi dir="ltr">VS Code</bdi> وسجّل الدخول إلى <bdi dir="ltr">GitHub Copilot</bdi>.
- ثبّت مفسّر <bdi dir="ltr">Python</bdi> معتمدًا من الإصدارات <bdi dir="ltr">3.10</bdi> إلى <bdi dir="ltr">3.13</bdi>.
- نزّل <bdi dir="ltr">BugIt</bdi> من لوحة تحكم حسابك وفك ضغطه في مجلد محلي.
- لا تضع الرموز المميزة أو بيانات العملاء أو الشفرة المصدرية الخاصة في الدردشة أو ملفات الإعداد.

## التفعيل والتهيئة

- افتح مجلد <bdi dir="ltr">BugIt</bdi> الذي فككت ضغطه كمساحة عمل موثوقة في <bdi dir="ltr">VS Code</bdi>.
- في دردشة <bdi dir="ltr">Copilot Chat</bdi>، اختر وكيل <bdi dir="ltr">BugIt QA Agent</bdi> واكتب <bdi dir="ltr">`Activate`</bdi> (أضف <bdi dir="ltr">`--solo`</bdi> أو <bdi dir="ltr">`--team`</bdi> إذا كان حسابك يتضمن كلا النوعين).
- يفتح <bdi dir="ltr">BugIt</bdi> بوابة <bdi dir="ltr">BugIt Portal</bdi> في متصفحك. سجّل الدخول بحساب <bdi dir="ltr">BugIt</bdi> الخاص بك — تبقى كلمة مرورك في المتصفح ولا تُدخل أبدًا في <bdi dir="ltr">VS Code</bdi>.
- اختر استحقاق ترخيص <bdi dir="ltr">Solo</bdi> أو <bdi dir="ltr">Team</bdi> لهذا الجهاز، ثم راجع هذا الجهاز ووافق عليه.
- عُد إلى <bdi dir="ltr">VS Code</bdi>. يُنهي <bdi dir="ltr">BugIt</bdi> التفويض تلقائيًا — لا يوجد مفتاح ترخيص للنسخ أو اللصق أو الكشف عنه.
- اكتب <bdi dir="ltr">`Begin setup`</bdi> واختر فقط التكاملات التي يستخدمها فريقك.
- صِل نظام التتبع مرة واحدة: <bdi dir="ltr">`python tools/connect.py jira`</bdi> (وكذلك <bdi dir="ltr">`ado`</bdi> و<bdi dir="ltr">`github`</bdi> و<bdi dir="ltr">`gitlab`</bdi> و<bdi dir="ltr">`linear`</bdi> و<bdi dir="ltr">`clickup`</bdi> و<bdi dir="ltr">`asana`</bdi> و<bdi dir="ltr">`trello`</bdi> و<bdi dir="ltr">`shortcut`</bdi> و<bdi dir="ltr">`youtrack`</bdi> و<bdi dir="ltr">`bugzilla`</bdi>). تنشئ الرمز في حسابك أنت وتلصقه في مطالبة محلية مخفية؛ ويُحفظ في مخزن بيانات الاعتماد بنظام التشغيل، لا في ملف.
- دع <bdi dir="ltr">BugIt</bdi> يتحقق من الخدمة والمشروع المحددَين قبل إنشاء أي تذكرة وإرسالها.

## إدارة وصولك

- يستخدم كل تثبيت استحقاق ترخيص نشطًا واحدًا في المرة الواحدة. لنقل هذا الجهاز إلى استحقاق مختلف من <bdi dir="ltr">Solo</bdi> أو <bdi dir="ltr">Team</bdi>، اكتب <bdi dir="ltr">`Switch license`</bdi> ووافق مجددًا في المتصفح؛ وإذا ألغيت، يبقى استحقاقك الحالي كما هو.
- يزيل أمر <bdi dir="ltr">`Deactivate`</bdi> الاستحقاق من هذا الجهاز فحسب. تُدار المقاعد والأجهزة والعضويات والأدوار والفوترة في البوابة، وليس في <bdi dir="ltr">VS Code</bdi>.
- وصول <bdi dir="ltr">Team</bdi> مخصص لكل شخص: يسجّل كل عضو الدخول بحساب <bdi dir="ltr">BugIt</bdi> الخاص به وبعضوية نشطة. لا يوجد مفتاح مشترك ولا تسجيل دخول مشترك.
- بعد فحص ناجح عبر الإنترنت، يستمر <bdi dir="ltr">BugIt</bdi> في العمل دون اتصال لمدة تصل إلى <bdi dir="ltr">72</bdi> ساعة في كلتا الفئتين <bdi dir="ltr">Solo</bdi> و<bdi dir="ltr">Team</bdi>، ويُطبّق أحدث حالة من البوابة فور إعادة الاتصال.
- تُفوَّض التحديثات بواسطة استحقاقك الموقّع، لذا لا يطلب تنزيل إصدار جديد أي مفتاح.

## حالة الاتصال

- يسجّل <bdi dir="ltr">BugIt</bdi> في أحد عشر نظام تتبع عبر واجهة <bdi dir="ltr">REST API</bdi> الخاصة بكلٍّ منها، ببيانات اعتماد تنشئها في حسابك الخاص: <bdi dir="ltr">Jira Cloud</bdi> و<bdi dir="ltr">Azure DevOps</bdi> و<bdi dir="ltr">GitHub Issues</bdi> و<bdi dir="ltr">GitLab Issues</bdi> و<bdi dir="ltr">Bugzilla</bdi> و<bdi dir="ltr">YouTrack</bdi> و<bdi dir="ltr">Linear</bdi> و<bdi dir="ltr">Shortcut</bdi> و<bdi dir="ltr">ClickUp</bdi> و<bdi dir="ltr">Asana</bdi> و<bdi dir="ltr">Trello</bdi>. ويتحقق الإعداد من الاتصال قبل أن تعتمد عليه.
- يتصل <bdi dir="ltr">Confluence Cloud</bdi> كمصدر معرفة عبر مسار <bdi dir="ltr">Atlassian Rovo MCP</bdi> الموجّه، مع تسجيل الدخول في المتصفح. ويبقى <bdi dir="ltr">Sentry</bdi> و<bdi dir="ltr">Notion</bdi> تجريبيين إلى أن تُستوفى متطلباتهما وتنجح فحوصهما المباشرة.
- تتطلب الخدمات الأخرى المذكورة خادم <bdi dir="ltr">MCP</bdi> متوافقًا توفره مؤسستك. ويقدّم <bdi dir="ltr">BugIt</bdi> إرشادات إعداد لكنه لا يوفر تلك الخوادم ولا يختبرها.

## تقريرك الأول

- صِف المشكلة بلغة واضحة، مع توضيح مكان حدوثها وتكرارها.
- أجب عن أي أسئلة لازمة لإتمام خطوات إعادة الإنتاج.
- راجع المعاينة، وخاصة البيانات الخاصة ودرجة الخطورة والمشروع والمرفقات.
- لا يصل أي شيء إلى نظام التتبع لديك حتى ترُدّ بـ <bdi dir="ltr">`FILE IT`</bdi> تمامًا. و«نعم» أو «تفضل» ليست تأكيدًا.

## الحصول على المساعدة

شغّل <bdi dir="ltr">`Check status`</bdi> أو <bdi dir="ltr">`Check readiness`</bdi> في وكيل <bdi dir="ltr">BugIt</bdi> أولًا. إذا استمرت المشكلة، افتح تذكرة دعم من لوحة تحكم حسابك على <bdi dir="ltr">BugIt</bdi> من دون تضمين أسرار أو مواد مشاريع سرية. يُقدَّم الدعم باللغة الإنجليزية فقط.
