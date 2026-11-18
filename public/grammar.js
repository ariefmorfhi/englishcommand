// English Pathway — grammar syllabus
// Each lesson: English explanation (simple B1 wording) + hidden Indonesian summary (bahasa baku, KBBI).
// tags link lessons to error categories in the error log.

export const UNITS = [
  { id: 'u1', name: 'Sentence foundations' },
  { id: 'u2', name: 'Nouns and articles' },
  { id: 'u3', name: 'Prepositions' },
  { id: 'u4', name: 'Verbs and tenses' },
  { id: 'u5', name: 'Describing things' },
  { id: 'u6', name: 'Complex sentences' },
  { id: 'u7', name: 'Writing well for exams' },
];

export const LESSONS = [
  // ===================== UNIT 1 =====================
  {
    id: 'sentence-core', unit: 'u1', title: 'Every sentence needs a subject and a verb', tags: ['sentence_structure'], mins: 10,
    why: 'Indonesian often drops the subject ("Sangat penting untuk…") or the verb ("Dia guru"). English never does. This is the base of every other rule.',
    rules: [
      { h: 'The basic pattern', body: 'Subject + Verb + (Object / Complement) + (Modifier). Every clause has at least a subject and a verb.', good: ['I manage the team.', 'She is a teacher.', 'The meeting starts at nine.'], bad: ['She a teacher.', 'Manage the team every day.'] },
      { h: 'Use "it" or "there" as an empty subject', body: 'When there is no real subject, English adds "it" (for weather, time, opinions) or "there" (to say something exists).', good: ['It is important to practise every day.', 'It is raining.', 'There are five people in my team.'], bad: ['Is important to practise every day.', 'Have five people in my team.'] },
      { h: '"be" is a real verb', body: 'Use am / is / are / was / were before adjectives, nouns and places. Indonesian has no "be", so it is easy to forget.', good: ['The gym is busy on weekends.', 'They were tired.'], bad: ['The gym busy on weekends.', 'They tired.'] },
      { h: 'Keep the object', body: 'Verbs like make, create, send, give usually need an object. Indonesian can drop it; English cannot.', good: ['Can you send it to me?', 'I created it last year.'], bad: ['Can you send to me?', 'I created last year.'] },
    ],
    trap: '"Ada" = "there is / there are", not "have". "Di kantor ada lima orang" → "There are five people in the office."',
    id_sum: 'Setiap klausa dalam bahasa Inggris wajib memiliki subjek dan predikat (verba). Jika tidak ada subjek yang nyata, gunakan "it" (untuk cuaca, waktu, atau pendapat) atau "there" (untuk menyatakan keberadaan, padanan kata "ada"). Kata "be" (am/is/are/was/were) wajib dipakai sebelum adjektiva, nomina, atau keterangan tempat. Objek dari verba seperti "send", "make", dan "create" tidak boleh dihilangkan.',
    check: [
      { q: 'Choose the correct sentence.', o: ['Is necessary to book in advance.', 'It is necessary to book in advance.', 'Necessary to book in advance.'], a: 1, why: 'English needs a subject: "It is…".' },
      { q: '"Di gudang ada tiga mesin." =', o: ['The warehouse has three machines there.', 'In the warehouse have three machines.', 'There are three machines in the warehouse.'], a: 2, why: '"Ada" = there is / there are.' },
      { q: 'Choose the correct sentence.', o: ['My manager very strict.', 'My manager is very strict.', 'My manager being very strict.'], a: 1, why: 'Adjectives need "be": is strict.' },
      { q: 'Choose the correct sentence.', o: ['I will send to you tomorrow.', 'I will send it to you tomorrow.', 'I will sending it tomorrow.'], a: 1, why: 'Keep the object "it".' },
    ],
  },
  {
    id: 'agreement', unit: 'u1', title: 'Subject–verb agreement', tags: ['agreement', 'verb_form'], mins: 12,
    why: 'In the present simple, the verb changes with the subject. Examiners notice this error immediately.',
    rules: [
      { h: 'He / she / it → verb + s', body: 'With a singular third-person subject, add -s or -es to the verb. With I / you / we / they and plural nouns, use the base verb.', good: ['She manages the schedule.', 'The system works well.', 'They manage the schedule.', 'My colleagues work in shifts.'], bad: ['She manage the schedule.', 'They manages the schedule.'] },
      { h: 'Find the real subject', body: 'Ignore words between the subject and the verb. The verb agrees with the main noun.', good: ['One of my responsibilities is hiring staff.', 'The quality of the products is high.'], bad: ['One of my responsibilities are hiring staff.', 'The quality of the products are high.'] },
      { h: 'Words that are always singular', body: 'everyone, everybody, someone, nobody, each, every + noun, the number of, a gerund (-ing) subject, a whole clause as subject.', good: ['Everyone has a role.', 'The number of visitors is growing.', 'Working abroad is my goal.', 'What you do makes you smart.'], bad: ['Everyone have a role.', 'What you do make you smart.'] },
      { h: 'a number of = plural', body: '"A number of" means "many", so it takes a plural verb. "The number of" is one number, so it is singular.', good: ['A number of customers have complained.', 'The number of complaints has fallen.'], bad: ['A number of customers has complained.'] },
    ],
    trap: 'Do not mix this with "verb jamak / tunggal". Simply remember: he / she / it / one thing → add -s.',
    id_sum: 'Pada kala kini (present simple), verba mendapat akhiran -s/-es jika subjeknya orang ketiga tunggal (he, she, it, atau satu benda). Jika subjeknya I, you, we, they, atau nomina jamak, gunakan verba bentuk dasar. Verba selalu mengikuti inti subjek, bukan kata yang terletak di antaranya. Kata everyone, each, the number of, gerund (-ing), dan anak kalimat yang menjadi subjek selalu dianggap tunggal, sedangkan "a number of" (= banyak) dianggap jamak.',
    check: [
      { q: 'One of the main problems ___ the long waiting time.', o: ['are', 'is', 'be'], a: 1, why: 'The subject is "one".' },
      { q: 'Each member of the team ___ a clear task.', o: ['has', 'have', 'having'], a: 0, why: '"Each" is singular.' },
      { q: 'A number of staff ___ asked for more training.', o: ['has', 'have', 'is'], a: 1, why: '"A number of" = many → plural.' },
      { q: 'Learning new skills ___ me motivated.', o: ['keep', 'keeps', 'are keeping'], a: 1, why: 'A gerund subject is singular.' },
    ],
  },

  // ===================== UNIT 2 =====================
  {
    id: 'articles', unit: 'u2', title: 'Articles: a, an, the, or nothing', tags: ['article'], mins: 15,
    why: 'Indonesian has no articles, so this is one of your top error patterns. The rules are few; the habit takes practice.',
    rules: [
      { h: 'a / an = one, not specific', body: 'Use a / an with a singular countable noun when you mention it for the first time or it is one of many. A singular countable noun can never stand alone.', good: ['I work at a climbing gym.', 'She is an engineer.'], bad: ['I work at climbing gym.', 'She is engineer.'] },
      { h: 'a or an depends on the SOUND, not the letter', body: 'Use "an" before a vowel SOUND and "a" before a consonant SOUND.', good: ['an operations supervisor', 'an hour (h is silent)', 'an MBA ("em")', 'a university ("you")', 'a European country ("you")'], bad: ['a operations supervisor', 'a hour', 'an university'] },
      { h: 'the = both people know which one', body: 'Use "the" for something already mentioned, something unique, or something made specific by the rest of the sentence. Also with superlatives and ordinal numbers.', good: ['I bought a laptop. The laptop is fast.', 'the internet, the government', 'the best decision', 'the first day', 'the manager of this branch'], bad: ['Internet has changed our lives.', 'It was best decision.'] },
      { h: 'No article for general ideas', body: 'Use no article with plural or uncountable nouns when you speak in general.', good: ['Technology changes quickly.', 'Customers expect fast service.', 'I like music.'], bad: ['The technology changes quickly. (in general)', 'The customers expect fast service. (in general)'] },
      { h: 'Fixed phrases without an article', body: 'go to work, at work, at home, go to bed, by car, by bus, in hospital (UK), at school (as a student).', good: ['I go to work by motorbike.'], bad: ['I go to the work by a motorbike.'] },
    ],
    trap: 'Check every singular noun in your writing: does it have a / an / the / my / this? If not, it is probably wrong.',
    id_sum: 'Nomina tunggal yang dapat dihitung tidak boleh berdiri sendiri; harus didahului a/an/the atau kata lain seperti my/this. Pilihan "a" atau "an" ditentukan oleh BUNYI awal kata, bukan hurufnya: "an hour", "a university", "an operations supervisor". Gunakan "the" jika pembaca sudah tahu benda yang dimaksud (sudah disebut sebelumnya, satu-satunya, atau dijelaskan oleh bagian kalimat lain) serta dengan superlatif. Jangan gunakan artikel untuk nomina jamak atau nomina tak terhitung yang bermakna umum.',
    check: [
      { q: 'He has ___ honest attitude.', o: ['a', 'an', 'the'], a: 1, why: '"Honest" starts with a vowel sound (h is silent).' },
      { q: 'She studied at ___ university in Banten.', o: ['an', 'a', '—'], a: 1, why: '"University" starts with a "you" sound.' },
      { q: 'Choose the correct sentence.', o: ['I work as supervisor.', 'I work as a supervisor.', 'I work as the supervisor of.'], a: 1, why: 'A singular countable noun needs an article.' },
      { q: '___ education is important for every country. (in general)', o: ['The', 'An', '—'], a: 2, why: 'General, uncountable idea → no article.' },
    ],
  },
  {
    id: 'countable', unit: 'u2', title: 'Countable and uncountable nouns', tags: ['article', 'word_choice', 'agreement'], mins: 10,
    why: 'Many words that are countable in Indonesian are uncountable in English. Adding -s to them is a common exam error.',
    rules: [
      { h: 'Uncountable nouns have no plural', body: 'No -s, no a / an. Common ones: information, advice, equipment, furniture, feedback, research, knowledge, homework, money, traffic, news, evidence, staff (as a group), luggage.', good: ['Thank you for the information.', 'We bought new equipment.', 'She gave me some useful advice.'], bad: ['Thank you for the informations.', 'We bought new equipments.', 'She gave me an advice.'] },
      { h: 'To count them, use a unit', body: 'a piece of advice, a piece of equipment, an item of news, a sum of money.', good: ['a piece of feedback', 'two pieces of equipment'], bad: ['two equipments'] },
      { h: 'Quantity words', body: 'Countable: many, a few, few, a number of. Uncountable: much, a little, little, an amount of. Both: some, any, a lot of, plenty of.', good: ['many customers', 'much time', 'a few problems', 'a little experience'], bad: ['much customers', 'many time'] },
      { h: 'Some words change meaning', body: '"experience" (skill, uncountable) vs "an experience" (one event). "work" (job, uncountable) vs "a work" (art, rare). "time" (uncountable) vs "three times" (occasions).', good: ['I have five years of experience.', 'It was a great experience.'], bad: ['I have many experiences in management.'] },
    ],
    trap: '"Informasi-informasi" or "saran-saran" do not become "informations" or "advices". Keep them singular.',
    id_sum: 'Beberapa nomina yang dalam bahasa Indonesia dapat dihitung justru tidak dapat dihitung dalam bahasa Inggris, misalnya information, advice, equipment, feedback, research, dan experience (dalam arti pengalaman kerja). Nomina tersebut tidak boleh diberi akhiran -s atau artikel a/an. Untuk menghitungnya, gunakan satuan seperti "a piece of". Gunakan many/few untuk nomina terhitung, dan much/little untuk nomina tak terhitung.',
    check: [
      { q: 'Choose the correct sentence.', o: ['I need more informations.', 'I need more information.', 'I need an information.'], a: 1, why: '"Information" is uncountable.' },
      { q: 'We don\'t have ___ time before the event.', o: ['many', 'much', 'a few'], a: 1, why: '"Time" is uncountable → much.' },
      { q: 'Choose the best sentence for a job interview.', o: ['I have many experiences in operations.', 'I have a lot of experience in operations.', 'I have an experience in operations.'], a: 1, why: 'Work experience is uncountable.' },
      { q: 'The trainer gave us ___ useful feedback.', o: ['a', 'some', 'many'], a: 1, why: '"Feedback" is uncountable → some.' },
    ],
  },

  // ===================== UNIT 3 =====================
  {
    id: 'in-on-at-time', unit: 'u3', title: 'In, on, at for TIME', tags: ['preposition'], mins: 12,
    why: 'Indonesian uses one word, "pada", where English uses three. Think of a pyramid: IN for big periods, ON for days, AT for exact points.',
    rules: [
      { h: 'IN = long or general periods', body: 'months, years, seasons, centuries, and parts of the day (except night).', good: ['in November', 'in 2026', 'in the rainy season', 'in the morning', 'in the afternoon', 'in the evening'], bad: ['on November', 'at 2026'] },
      { h: 'ON = days and dates', body: 'days of the week, dates, specific days, and a day + part of the day.', good: ['on Monday', 'on 17 December', 'on my birthday', 'on Monday morning', 'on weekdays'], bad: ['in Monday', 'at 17 December'] },
      { h: 'AT = exact points in time', body: 'clock times, short moments, and some fixed phrases.', good: ['at 9 a.m.', 'at noon', 'at night', 'at the weekend (UK) / on the weekend (US)', 'at the moment', 'at the end of the month'], bad: ['in 9 a.m.', 'in night'] },
      { h: 'NO preposition', body: 'before this, next, last, every, today, tomorrow, yesterday.', good: ['I will call you next Monday.', 'We met last year.', 'I train every day.'], bad: ['on next Monday', 'in last year', 'at every day'] },
      { h: 'in vs at the end', body: '"at the end of the day" = at that point. "in the end" = finally, after a long process.', good: ['We close the cash register at the end of the day.', 'In the end, we chose a new supplier.'], bad: [] },
    ],
    trap: '"Pada" can be in, on, or at. Translate the TIME, not the word "pada": "pada bulan Maret" → in March; "pada hari Senin" → on Monday; "pada pukul 7" → at 7.',
    id_sum: 'Bayangkan piramida: IN untuk periode yang panjang atau umum (bulan, tahun, musim, pagi/siang/sore), ON untuk hari dan tanggal, AT untuk titik waktu yang tepat (jam, "at night", "at the moment"). Jangan memakai preposisi sebelum this, next, last, every, today, tomorrow, dan yesterday. Kata "pada" dalam bahasa Indonesia bisa diterjemahkan menjadi in, on, atau at bergantung pada jenis waktunya.',
    check: [
      { q: 'The final assessment is ___ 31 March.', o: ['in', 'on', 'at'], a: 1, why: 'Dates → on.' },
      { q: 'I usually study ___ night.', o: ['in', 'on', 'at'], a: 2, why: 'Fixed phrase: at night.' },
      { q: 'I started this job ___ 2024.', o: ['in', 'on', 'at'], a: 0, why: 'Years → in.' },
      { q: 'Choose the correct sentence.', o: ['I will take the test on next month.', 'I will take the test next month.', 'I will take the test in next month.'], a: 1, why: 'No preposition before "next".' },
      { q: 'The shift starts ___ 7.30.', o: ['at', 'on', 'in'], a: 0, why: 'Clock time → at.' },
    ],
  },
  {
    id: 'in-on-at-place', unit: 'u3', title: 'In, on, at for PLACE', tags: ['preposition'], mins: 12,
    why: 'The same pyramid works for places: IN = inside an area, ON = on a surface or line, AT = a point or a place for a purpose.',
    rules: [
      { h: 'IN = inside, enclosed, or a big area', body: 'rooms, buildings (when you mean inside), cities, countries, and closed vehicles.', good: ['in the office', 'in Jakarta', 'in Indonesia', 'in a car', 'in a taxi', 'in the photo'], bad: ['at Indonesia', 'on Jakarta'] },
      { h: 'ON = surface, line, floor, or public transport', body: 'on the table, on the wall, on the second floor, on the street (US), on the bus, on the train, on the plane, on the website, on the list.', good: ['Our office is on the third floor.', 'I read it on your website.', 'She is on the bus.'], bad: ['in the third floor', 'in the website'] },
      { h: 'AT = a point or a place where an activity happens', body: 'addresses, specific points, and places we go to for a purpose: at work, at home, at school, at the airport, at the front desk, at a company.', good: ['I work at Boulder Planet.', 'at Jl. Sudirman 10', 'Wait for me at the entrance.', 'at the meeting'], bad: ['I work in Boulder Planet. (as an employer)'] },
      { h: 'NO preposition', body: 'home (after verbs of movement), abroad, overseas, downstairs, upstairs, here, there, downtown.', good: ['I want to work overseas.', 'I went home early.', 'She lives abroad.'], bad: ['I want to work in overseas.', 'I went to home early.'] },
      { h: 'Arrive in / arrive at', body: 'arrive in + city or country; arrive at + building or point. Never "arrive to".', good: ['We arrived in Singapore.', 'We arrived at the hotel.'], bad: ['We arrived to the hotel.'] },
    ],
    trap: '"Di" can also be in, on, or at. Ask: is it inside (in), on a surface or line (on), or a point / purpose (at)?',
    id_sum: 'IN dipakai untuk ruang tertutup atau wilayah luas (kantor, kota, negara, mobil). ON dipakai untuk permukaan, lantai gedung, situs web, dan angkutan umum (bus, kereta, pesawat). AT dipakai untuk titik tertentu atau tempat yang dikaitkan dengan kegiatannya (at work, at home, at the airport, at a company). Kata home (setelah verba gerak), abroad, dan overseas tidak memakai preposisi. Kata "di" dalam bahasa Indonesia dapat menjadi in, on, atau at sesuai jenis tempatnya.',
    check: [
      { q: 'I work ___ an indoor climbing gym.', o: ['at', 'on', 'in the'], a: 0, why: 'Workplace / company → at.' },
      { q: 'The meeting room is ___ the second floor.', o: ['in', 'on', 'at'], a: 1, why: 'Floors → on.' },
      { q: 'She has lived ___ Malaysia for two years.', o: ['in', 'on', 'at'], a: 0, why: 'Countries → in.' },
      { q: 'Choose the correct sentence.', o: ['I hope to work in overseas.', 'I hope to work overseas.', 'I hope to work at overseas.'], a: 1, why: '"Overseas" needs no preposition.' },
      { q: 'I saw the job advert ___ LinkedIn.', o: ['in', 'on', 'at'], a: 1, why: 'Websites and apps → on.' },
    ],
  },
  {
    id: 'dependent-prep', unit: 'u3', title: 'Words that always take a certain preposition', tags: ['preposition', 'l1_transfer'], mins: 12,
    why: 'Many verbs and adjectives have a fixed partner preposition. These must be learned as chunks, not translated.',
    rules: [
      { h: 'Adjective + preposition', body: 'responsible for, interested in, good at, familiar with, aware of, capable of, different from, keen on, satisfied with, afraid of.', good: ['I am responsible for staff scheduling.', 'She is good at solving problems.'], bad: ['I am responsible to staff scheduling.', 'She is good in solving problems.'] },
      { h: 'Verb + preposition', body: 'depend on, rely on, focus on, believe in, succeed in, deal with, apply for (a job), apply to (a company), look forward to, listen to, wait for, pay for.', good: ['I applied for the position.', 'It depends on the season.', 'I look forward to hearing from you.'], bad: ['I applied the position.', 'It depends of the season.'] },
      { h: 'Verbs with NO preposition', body: 'discuss, contact, enter, reach, marry, attend, answer, lack. Indonesian adds "tentang / dengan", English does not.', good: ['We discussed the new policy.', 'Please contact me.', 'I attended the training.'], bad: ['We discussed about the new policy.', 'Please contact with me.', 'I attended to the training.'] },
      { h: 'After a preposition → noun or -ing', body: 'A preposition is followed by a noun, a pronoun, or a verb + -ing — never the base verb.', good: ['I am interested in working abroad.', 'Thank you for helping me.'], bad: ['I am interested in work abroad.', 'Thank you for help me.'] },
    ],
    trap: '"Diskusi tentang", "menghubungi dengan", "menikah dengan" → discuss, contact, marry (no preposition). But "married TO someone" when using "be married".',
    id_sum: 'Banyak adjektiva dan verba memiliki pasangan preposisi yang tetap, misalnya responsible for, interested in, good at, depend on, dan apply for. Pasangan ini harus dihafal sebagai satu kesatuan, bukan diterjemahkan kata demi kata. Sebaliknya, verba seperti discuss, contact, attend, dan marry tidak memakai preposisi walaupun padanannya dalam bahasa Indonesia memakai kata "tentang" atau "dengan". Setelah preposisi, gunakan nomina atau verba berakhiran -ing.',
    check: [
      { q: 'I am responsible ___ purchasing and stock control.', o: ['to', 'of', 'for'], a: 2, why: 'responsible for' },
      { q: 'Choose the correct sentence.', o: ['Let\'s discuss about the budget.', 'Let\'s discuss the budget.', 'Let\'s discuss on the budget.'], a: 1, why: '"Discuss" takes a direct object.' },
      { q: 'I look forward to ___ you.', o: ['meet', 'meeting', 'met'], a: 1, why: '"to" here is a preposition → -ing.' },
      { q: 'Success often depends ___ teamwork.', o: ['of', 'on', 'from'], a: 1, why: 'depend on' },
    ],
  },

  // ===================== UNIT 4 =====================
  {
    id: 'verb-patterns', unit: 'u4', title: 'Verb patterns: base verb, to + verb, or -ing', tags: ['verb_form'], mins: 15,
    why: 'This is your biggest error pattern ("to keeping grow", "to added value"). Three simple rules fix most of it.',
    rules: [
      { h: 'After "to" (infinitive) → base verb', body: 'want to learn, plan to work, need to improve, try to adapt. Never -ing, -ed, or -s after this "to".', good: ['I want to keep growing.', 'I plan to add value to the team.'], bad: ['I want to keeping grow.', 'I plan to added value.'] },
      { h: 'After a modal → base verb', body: 'can, could, will, would, shall, should, may, might, must + base verb. No "to", no -s, no -ed.', good: ['You should check it.', 'She can speak three languages.', 'We must finish today.'], bad: ['You should checked it.', 'She can speaks three languages.', 'We must to finish today.'] },
      { h: 'Verbs followed by -ing', body: 'enjoy, avoid, finish, consider, keep, mind, suggest, recommend, practise, risk, can\'t help, look forward to, be used to.', good: ['I enjoy solving problems.', 'I suggest reviewing the schedule.', 'I am used to working under pressure.'], bad: ['I enjoy to solve problems.', 'I suggest to review the schedule.'] },
      { h: 'Verbs followed by to + base verb', body: 'want, need, plan, decide, hope, expect, agree, refuse, promise, manage, learn, would like.', good: ['We decided to hire two more staff.', 'I would like to apply.'], bad: ['We decided hiring two more staff.'] },
      { h: 'Make / let / help + object + base verb', body: 'make someone do, let someone do, help someone (to) do. Causative "have": have someone do; "get": get someone to do.', good: ['My manager let me lead the project.', 'I had the technician check the wall.', 'I got my team to update the SOP.'], bad: ['My manager let me to lead the project.'] },
    ],
    trap: 'Indonesian verbs never change form, so check every verb after "to", a modal, or a preposition.',
    id_sum: 'Setelah "to" (infinitif) dan setelah modal (can, will, should, must, dan sebagainya), selalu gunakan verba bentuk dasar tanpa -s, -ed, atau -ing. Setelah preposisi dan setelah verba tertentu (enjoy, avoid, finish, suggest, look forward to), gunakan verba berakhiran -ing. Verba lain (want, need, plan, decide, hope) diikuti oleh "to" + verba dasar. Verba make, let, dan have (kausatif) diikuti objek lalu verba dasar tanpa "to".',
    check: [
      { q: 'I hope to ___ my English by March.', o: ['improving', 'improve', 'improved'], a: 1, why: 'to + base verb' },
      { q: 'Visitors must ___ a waiver before climbing.', o: ['to sign', 'signing', 'sign'], a: 2, why: 'modal + base verb' },
      { q: 'I suggest ___ the meeting to Friday.', o: ['to move', 'moving', 'move'], a: 1, why: 'suggest + -ing' },
      { q: 'My manager made me ___ the report again.', o: ['to write', 'write', 'writing'], a: 1, why: 'make + object + base verb' },
      { q: 'She can ___ fluently.', o: ['speaks', 'speak', 'to speak'], a: 1, why: 'modal + base verb' },
    ],
  },
  {
    id: 'present-tenses', unit: 'u4', title: 'Present simple vs present continuous', tags: ['tense', 'verb_form'], mins: 12,
    why: 'Indonesian uses "sedang" only sometimes. English must choose: is it a routine or happening now?',
    rules: [
      { h: 'Present simple = facts, habits, routines', body: 'Use it for things that are generally true or happen regularly. Signal words: always, usually, every day, often.', good: ['I manage a team of twelve.', 'The gym opens at 10 a.m.', 'I usually study at night.'], bad: ['I am managing a team every day.'] },
      { h: 'Present continuous = now or temporary', body: 'am / is / are + -ing. Use it for actions in progress or temporary situations. Signal words: now, at the moment, this week, currently.', good: ['I am preparing for the IELTS test.', 'We are hiring new staff this month.'], bad: ['I prepare for the IELTS test at the moment.'] },
      { h: 'Stative verbs are not used in -ing form', body: 'Verbs about states, not actions: know, understand, believe, want, need, like, prefer, own, belong, seem, mean.', good: ['I know the answer.', 'I need more time.'], bad: ['I am knowing the answer.', 'I am needing more time.'] },
      { h: 'Do not forget "be" in the continuous', body: 'The continuous needs am / is / are + -ing.', good: ['She is working today.'], bad: ['She working today.'] },
    ],
    trap: '"Saya bekerja di…" describing your job = present simple: "I work at…", not "I am working at…" (unless it is temporary).',
    id_sum: 'Present simple dipakai untuk fakta, kebiasaan, dan rutinitas (I work, she manages). Present continuous (am/is/are + -ing) dipakai untuk tindakan yang sedang berlangsung atau situasi sementara (I am preparing for the test). Verba keadaan seperti know, need, want, dan understand tidak dipakai dalam bentuk -ing.',
    check: [
      { q: 'I ___ as an operations supervisor. (my job)', o: ['work', 'am work', 'working'], a: 0, why: 'A permanent job → present simple.' },
      { q: 'Right now we ___ a new booking system.', o: ['test', 'are testing', 'tests'], a: 1, why: 'Now / temporary → continuous.' },
      { q: 'Choose the correct sentence.', o: ['I am understanding the problem.', 'I understand the problem.', 'I understanding the problem.'], a: 1, why: '"Understand" is stative.' },
      { q: 'The shuttle bus ___ every 20 minutes.', o: ['is leaving', 'leaves', 'leave'], a: 1, why: 'Timetable / routine → present simple.' },
    ],
  },
  {
    id: 'past-perfect', unit: 'u4', title: 'Past simple vs present perfect', tags: ['tense', 'verb_form'], mins: 15,
    why: 'This is the tense choice that IELTS examiners check most in Speaking Part 1 and 2.',
    rules: [
      { h: 'Past simple = finished time', body: 'Use it when the time is finished or stated: yesterday, last year, in 2018, two days ago, when I was a student.', good: ['I joined the company in 2024.', 'We organised a national competition last year.'], bad: ['I have joined the company in 2024.'] },
      { h: 'Present perfect = past connected to now', body: 'have / has + past participle (V3). Use it for experience (no specific time), for unfinished periods, and with for / since.', good: ['I have worked here since 2024.', 'I have organised five competitions.', 'Have you ever been abroad?'], bad: ['I work here since 2024.', 'I worked here since 2024.'] },
      { h: 'for vs since', body: 'for + length of time (for two years). since + starting point (since 2024, since June). "Since two years ago" is wrong.', good: ['for two years', 'since June 2024'], bad: ['since two years ago', 'for 2024'] },
      { h: 'Past continuous and past perfect', body: 'Past continuous (was / were + -ing) = action in progress when something else happened. Past perfect (had + V3) = the earlier of two past actions.', good: ['I was working when the power went out.', 'The guests had already left when I arrived.'], bad: [] },
      { h: 'Learn the irregular V3 forms', body: 'learn – learned – learned; know – knew – known; take – took – taken; write – wrote – written; lead – led – led; build – built – built.', good: ['I have learned a lot.', 'I have led several events.'], bad: ['I have learn a lot.', 'I have lead several events.'] },
    ],
    trap: '"Saya sudah bekerja di sini selama dua tahun" = "I have worked here for two years" (not "I worked here since two years").',
    id_sum: 'Past simple dipakai untuk kejadian pada waktu lampau yang sudah selesai dan disebutkan (in 2024, last year, yesterday). Present perfect (have/has + V3) dipakai untuk pengalaman tanpa waktu tertentu, periode yang belum selesai, dan bersama for/since. "For" diikuti lama waktu (for two years), sedangkan "since" diikuti titik awal (since 2024). Bentuk "since two years ago" tidak tepat.',
    check: [
      { q: 'I ___ at Boulder Planet since June 2024.', o: ['work', 'worked', 'have worked'], a: 2, why: 'since + present perfect' },
      { q: 'We ___ an ASEAN competition last year.', o: ['have organised', 'organised', 'organise'], a: 1, why: '"Last year" = finished time → past simple.' },
      { q: 'I have been a supervisor ___ five months.', o: ['since', 'for', 'during'], a: 1, why: 'Length of time → for.' },
      { q: 'Choose the correct sentence.', o: ['I have learn a lot from this job.', 'I have learned a lot from this job.', 'I learned a lot since this job.'], a: 1, why: 'have + past participle (learned).' },
    ],
  },
  {
    id: 'future', unit: 'u4', title: 'Talking about the future', tags: ['tense'], mins: 8,
    why: 'Interviews always ask about your plans. Using the right future form sounds natural and confident.',
    rules: [
      { h: 'going to = plans already decided', body: 'Use it for intentions and plans made before speaking.', good: ['I am going to take the IELTS test in April.'], bad: [] },
      { h: 'will = decisions now, promises, predictions', body: 'Use it for decisions made at the moment of speaking, offers, promises and predictions.', good: ['I will send you the report today.', 'I think AI will change many jobs.'], bad: ['I will to send you the report.'] },
      { h: 'Present continuous = fixed arrangements', body: 'For arranged plans with a time and other people involved.', good: ['I am meeting the director on Friday.'], bad: [] },
      { h: 'After when / if / as soon as → present, not will', body: 'In time and condition clauses about the future, use the present simple.', good: ['I will call you when I arrive.', 'If I pass, I will apply abroad.'], bad: ['I will call you when I will arrive.'] },
    ],
    trap: '"Nanti kalau saya sudah sampai" → "when I arrive" (present), not "when I will arrive".',
    id_sum: 'Gunakan "be going to" untuk rencana yang sudah diputuskan sebelumnya, "will" untuk keputusan saat berbicara, janji, dan prediksi, serta present continuous untuk janji temu atau rencana yang sudah diatur. Setelah kata when, if, dan as soon as yang merujuk ke masa depan, gunakan present simple, bukan "will".',
    check: [
      { q: 'I ___ apply for jobs in Australia next year. (already planned)', o: ['am going to', 'will to', 'going to'], a: 0, why: 'A decided plan → going to.' },
      { q: 'I\'ll tell you as soon as I ___ the result.', o: ['will get', 'get', 'got'], a: 1, why: 'as soon as + present simple' },
      { q: '"The phone is ringing." "I ___ answer it."', o: ['am going to', 'will', 'answer'], a: 1, why: 'Decision at the moment → will.' },
      { q: 'If it ___ tomorrow, the outdoor event will be cancelled.', o: ['will rain', 'rains', 'rained'], a: 1, why: 'if + present simple' },
    ],
  },
  {
    id: 'passive-causative', unit: 'u4', title: 'Passive voice and causatives', tags: ['verb_form', 'sentence_structure'], mins: 12,
    why: 'Reports, emails and IELTS Task 1 use the passive often. It also helps you talk about processes.',
    rules: [
      { h: 'Form: be + past participle (V3)', body: 'The tense is shown by "be": is done, was done, has been done, will be done, can be done.', good: ['The equipment is checked every morning.', 'The SOP was approved last week.', 'The report will be sent tomorrow.'], bad: ['The equipment is check every morning.', 'The SOP was approve last week.'] },
      { h: 'When to use it', body: 'When the action is more important than the person, or the person is unknown or obvious. Add "by + person" only if it matters.', good: ['Customers are greeted at the front desk.', 'The schedule was created by the operations team.'], bad: [] },
      { h: 'Causative: have / get something done', body: 'Someone else does the action for you: have + object + V3, get + object + V3.', good: ['We had the walls repainted.', 'I got my laptop repaired.'], bad: ['We had the walls repaint.'] },
      { h: 'Active causative', body: 'have + person + base verb; get + person + to + base verb.', good: ['I had the technician check the auto-belay.', 'I got my team to update the checklist.'], bad: ['I got my team update the checklist.'] },
    ],
    trap: '"Di-" in Indonesian is often passive, but many "di-" sentences sound better as active English. Use the passive only when the doer is unimportant.',
    id_sum: 'Kalimat pasif dibentuk dengan be + verba bentuk ketiga (V3); kala ditunjukkan oleh bentuk "be" (is checked, was approved, will be sent). Gunakan pasif jika tindakannya lebih penting daripada pelakunya. Bentuk kausatif "have/get + objek + V3" berarti meminta orang lain mengerjakan sesuatu untuk kita (We had the walls repainted).',
    check: [
      { q: 'All new staff ___ during their first week.', o: ['are trained', 'are train', 'training'], a: 0, why: 'be + V3' },
      { q: 'The results ___ next Monday.', o: ['will announce', 'will be announced', 'will announced'], a: 1, why: 'will be + V3' },
      { q: 'I had my car ___ yesterday.', o: ['wash', 'washed', 'washing'], a: 1, why: 'have + object + V3' },
      { q: 'I got my brother ___ the room.', o: ['clean', 'to clean', 'cleaned'], a: 1, why: 'get + person + to + verb' },
    ],
  },

  // ===================== UNIT 5 =====================
  {
    id: 'adj-adv', unit: 'u5', title: 'Adjectives and adverbs', tags: ['word_choice', 'sentence_structure'], mins: 15,
    why: 'Using -ed / -ing adjectives and adverbs correctly makes your descriptions precise — important for Speaking Part 2.',
    rules: [
      { h: '-ed = how a person feels, -ing = what causes the feeling', body: 'bored / boring, interested / interesting, tired / tiring, satisfied / satisfying, confused / confusing.', good: ['I was interested in the film.', 'It was an interesting film.', 'The training was tiring, so I was tired.'], bad: ['It was an interested film.', 'I am boring. (unless you mean you make others bored)'] },
      { h: 'Adjective describes a noun; adverb describes a verb', body: 'Most adverbs = adjective + -ly. Irregular: good → well, fast → fast, hard → hard, late → late.', good: ['She is a careful worker. She works carefully.', 'He speaks English well.', 'We worked hard.'], bad: ['She works careful.', 'He speaks English good.'] },
      { h: 'hard ≠ hardly, late ≠ lately', body: '"hardly" = almost not. "lately" = recently.', good: ['I worked hard.', 'I hardly slept. (= I almost did not sleep)'], bad: ['I worked hardly. (means you almost did not work)'] },
      { h: 'Sense verbs + adjective', body: 'look, sound, smell, taste, feel, seem, become + adjective (not adverb) when describing the subject.', good: ['You look tired.', 'The plan sounds good.'], bad: ['The plan sounds well.'] },
      { h: 'Comparatives and superlatives', body: 'One syllable: -er / -est (tall, taller, tallest). Two syllables ending in -y: -ier / -iest (busy, busier). Most other words with two or more syllables: more / most (more careful, most efficient). Irregular: good – better – best, bad – worse – worst. Never "more better".', good: ['It is busier on weekends.', 'This is the most efficient method.', 'Our service is better now.'], bad: ['more better', 'more busier', 'carefuller'] },
      { h: 'too vs very', body: '"very" = a lot (positive or neutral). "too" before an adjective = more than is good (a problem). "too" at the end of a sentence = also.', good: ['The gym is very busy. (fine)', 'The gym is too busy to train. (a problem)', 'I like coffee too. (also)'], bad: [] },
    ],
    trap: '"Lebih baik lagi" ≠ "more better". Use "even better" or "much better".',
    id_sum: 'Adjektiva berakhiran -ed menyatakan perasaan seseorang (I am interested, tertarik), sedangkan -ing menyatakan hal yang menimbulkan perasaan itu (an interesting film, film yang menarik). Adjektiva menerangkan nomina, adverbia menerangkan verba (careful → carefully; good → well). Untuk perbandingan, kata bersuku satu memakai -er/-est, kata bersuku dua yang berakhiran -y memakai -ier/-iest, dan kata lainnya memakai more/most. Jangan pernah menulis "more better". "Too" sebelum adjektiva berarti "terlalu", sedangkan "too" di akhir kalimat berarti "juga".',
    check: [
      { q: 'The presentation was really ___.', o: ['bored', 'boring', 'bore'], a: 1, why: 'The thing causing the feeling → -ing.' },
      { q: 'She handled the complaint very ___.', o: ['professional', 'professionally', 'more professional'], a: 1, why: 'Describes the verb "handled" → adverb.' },
      { q: 'This method is ___ than the old one.', o: ['more efficient', 'efficienter', 'more efficienter'], a: 0, why: 'Long adjective → more.' },
      { q: 'Choose the correct sentence.', o: ['Your idea sounds greatly.', 'Your idea sounds great.', 'Your idea sounds more great.'], a: 1, why: 'sound + adjective' },
      { q: 'The room is ___ small for 30 people. (a problem)', o: ['very', 'too', 'so much'], a: 1, why: '"too" = more than acceptable.' },
    ],
  },

  // ===================== UNIT 6 =====================
  {
    id: 'conditionals', unit: 'u6', title: 'Conditionals: if sentences', tags: ['tense', 'sentence_structure'], mins: 12,
    why: 'IELTS Part 3 and Task 2 constantly ask "What would happen if…?". Conditionals show a higher grammar band.',
    rules: [
      { h: 'Zero: facts', body: 'If + present, present. Always true.', good: ['If you heat ice, it melts.', 'If a climber falls, the mat absorbs the impact.'], bad: [] },
      { h: 'First: real future possibility', body: 'If + present, will + base verb.', good: ['If I pass the test, I will apply for jobs abroad.'], bad: ['If I will pass the test, I will apply.'] },
      { h: 'Second: imaginary or unlikely now', body: 'If + past simple, would + base verb. Use "were" for all persons in formal English.', good: ['If I had more time, I would study more.', 'If I were the manager, I would change the schedule.'], bad: ['If I have more time, I would study more.', 'If I would have more time…'] },
      { h: 'Third: imaginary past', body: 'If + had + V3, would have + V3. For regrets and past results.', good: ['If I had studied harder, I would have passed.'], bad: ['If I studied harder, I would pass. (when talking about the past)'] },
      { h: 'Unless = if not', body: 'Unless you book in advance, you might not get a slot.', good: ['Unless you book in advance, you may not get a slot.'], bad: ['Unless you don\'t book… (double negative)'] },
    ],
    trap: 'Never put "will" or "would" in the if-clause itself.',
    id_sum: 'Kalimat pengandaian tipe 1 (If + present, will + verba dasar) dipakai untuk kemungkinan nyata di masa depan. Tipe 2 (If + past, would + verba dasar) dipakai untuk pengandaian yang tidak nyata pada saat ini. Tipe 3 (If + had + V3, would have + V3) dipakai untuk pengandaian tentang masa lalu. Jangan memakai "will" atau "would" di dalam anak kalimat yang diawali "if". "Unless" berarti "jika tidak".',
    check: [
      { q: 'If I ___ enough money, I will join the course.', o: ['will save', 'save', 'saved'], a: 1, why: 'First conditional: if + present.' },
      { q: 'If I ___ you, I would ask for feedback.', o: ['am', 'were', 'will be'], a: 1, why: 'Second conditional: if I were…' },
      { q: 'If we had prepared better, we ___ the deadline.', o: ['would meet', 'will meet', 'would have met'], a: 2, why: 'Third conditional.' },
      { q: '___ you register today, you will lose your place.', o: ['If', 'Unless', 'When'], a: 1, why: 'unless = if not' },
    ],
  },
  {
    id: 'clauses', unit: 'u6', title: 'Relative clauses and embedded questions', tags: ['sentence_structure'], mins: 12,
    why: 'Joining ideas with who / which / that is the fastest way to move from short B1 sentences to longer B2 sentences.',
    rules: [
      { h: 'who / which / that', body: 'who = people, which = things, that = people or things (in defining clauses). whose = possession. where = places.', good: ['The supervisor who trained me is now a manager.', 'The system that we built is still used.', 'A gym where beginners feel welcome.'], bad: ['The supervisor which trained me.', 'The system who we built.'] },
      { h: 'Do not repeat the subject or object', body: 'The relative pronoun replaces the noun. Do not add "he", "it", or "them" again.', good: ['The staff member who left was very experienced.'], bad: ['The staff member who he left was very experienced.', 'Mr Jack he is a good teacher.'] },
      { h: 'Embedded questions use normal word order', body: 'Inside a sentence, a question becomes subject + verb, with no do / does / did.', good: ['Can you tell me where the office is?', 'I don\'t know what time the meeting starts.', 'Could you explain how the system works?'], bad: ['Can you tell me where is the office?', 'I don\'t know what time does the meeting start.'] },
      { h: 'Noun clauses as subjects', body: 'What / that / how clauses can be the subject. They take a singular verb.', good: ['What customers want is fast service.', 'How we train new staff matters.'], bad: ['What customers want are fast service.'] },
    ],
    trap: '"Saya tidak tahu di mana kantornya" → "I don\'t know where the office is" (not "where is the office").',
    id_sum: 'Kata who dipakai untuk orang, which untuk benda, that untuk keduanya, whose untuk kepemilikan, dan where untuk tempat. Jangan mengulang subjek atau objek setelah kata penghubung tersebut. Pertanyaan yang berada di dalam kalimat lain (pertanyaan tidak langsung) memakai susunan subjek + verba tanpa do/does/did: "I don\'t know where the office is".',
    check: [
      { q: 'The manager ___ hired me is very supportive.', o: ['which', 'who', 'whose'], a: 1, why: 'People → who.' },
      { q: 'Could you tell me ___?', o: ['when does the course start', 'when the course starts', 'when starts the course'], a: 1, why: 'Embedded question → normal order.' },
      { q: 'Choose the correct sentence.', o: ['The report which I wrote it is ready.', 'The report which I wrote is ready.', 'The report who I wrote is ready.'], a: 1, why: 'Do not repeat "it".' },
      { q: 'What really matters ___ consistency.', o: ['are', 'is', 'were'], a: 1, why: 'A clause subject is singular.' },
    ],
  },

  // ===================== UNIT 7 =====================
  {
    id: 'indonesian-transfer', unit: 'u7', title: 'Indonesian habits to unlearn', tags: ['l1_transfer', 'word_choice'], mins: 12,
    why: 'These phrases are understood, but they immediately sound translated. Fixing them is the quickest way to sound natural.',
    rules: [
      { h: 'Contribute, impact, improve', body: '"memberikan kontribusi" → contribute / make a contribution. "memberi dampak" → have an impact on / make a difference. "membuat lebih baik" → improve.', good: ['I want to contribute to the company.', 'This change had a big impact on customers.', 'We improved the process.'], bad: ['I want to give contribution.', 'It gave impact to customers.', 'We made the process more better.'] },
      { h: 'Job words', body: '"jobdesk" → responsibilities / duties / job description. "bekerja di bidang" → work in (operations). "pegawai" → employee / staff member.', good: ['My main responsibilities include scheduling.', 'I work in operations.'], bad: ['My jobdesk is scheduling.'] },
      { h: 'agree, already, until now', body: '"Saya setuju" → I agree (not I am agree). "sudah" is often not "already" — use present perfect or nothing. "sampai sekarang" → so far / still.', good: ['I agree with you.', 'I have finished the report.', 'So far, the results are good.'], bad: ['I am agree with you.', 'I already finish the report.', 'Until now the results are good.'] },
      { h: 'explain, tell, say', body: 'explain something TO someone (not "explain me"). tell + person. say + words.', good: ['Could you explain the process to me?', 'She told me the result.', 'She said that it was ready.'], bad: ['Could you explain me the process?', 'She said me the result.'] },
      { h: 'Words that mean something else', body: '"elaborate" = explain in detail (not apply). "commute" = travel to work (not connect). "actually" = in fact (not "sebenarnya" as a filler). "even" = bahkan (not "walaupun").', good: ['I want to apply what I have learned.', 'I want to build a professional network.'], bad: ['I want to elaborate what I have learned.', 'I want to commute with new people.'] },
      { h: 'Avoid doubled ideas', body: '"In my opinion, I think" → choose one. "return back" → return. "repeat again" → repeat. "more better" → better.', good: ['In my opinion, remote work is effective.'], bad: ['In my opinion, I think remote work is effective.'] },
    ],
    trap: 'If a phrase came to you as a direct translation, check it here first.',
    id_sum: 'Beberapa frasa terdengar seperti terjemahan langsung dari bahasa Indonesia. Gunakan "contribute" (bukan "give contribution"), "responsibilities" (bukan "jobdesk"), "improve" (bukan "make more better"), "I agree" (bukan "I am agree"), dan "explain something to someone" (bukan "explain me"). Perhatikan makna kata yang sering keliru: elaborate berarti menjelaskan secara rinci, commute berarti perjalanan pergi-pulang kerja. Hindari pengulangan makna seperti "In my opinion, I think".',
    check: [
      { q: 'Natural English for "Saya ingin memberikan kontribusi bagi perusahaan":', o: ['I want to give contribution to the company.', 'I want to contribute to the company.', 'I want to make contribute the company.'], a: 1, why: 'Use the verb "contribute".' },
      { q: 'Choose the correct sentence.', o: ['Could you explain me how it works?', 'Could you explain how it works to me?', 'Could you explain to me how does it work?'], a: 1, why: 'explain something to someone' },
      { q: 'Natural English for "uraian tugas saya":', o: ['my jobdesk', 'my responsibilities', 'my job descs'], a: 1, why: '"Jobdesk" is not English.' },
      { q: 'Choose the correct sentence.', o: ['I am agree with the new policy.', 'I agree with the new policy.', 'I agreeing the new policy.'], a: 1, why: '"Agree" is a verb.' },
    ],
  },
  {
    id: 'linking', unit: 'u7', title: 'Linking ideas (cohesion)', tags: ['sentence_structure', 'word_choice'], mins: 12,
    why: 'Coherence and cohesion is 25% of the IELTS writing and speaking score. Good linking also makes you sound organised in interviews.',
    rules: [
      { h: 'Adding', body: 'In addition, Moreover, Furthermore, Also, as well as.', good: ['The system saves time. In addition, it reduces errors.'], bad: ['Besides that, it reduces errors. (very common, but weaker in formal writing)'] },
      { h: 'Contrast', body: 'However, (sentence start) / although, even though, while (inside a sentence) / despite + noun or -ing.', good: ['The plan was expensive. However, it worked.', 'Although it was expensive, it worked.', 'Despite the cost, it worked.'], bad: ['Although it was expensive, but it worked.', 'Despite it was expensive, it worked.'] },
      { h: 'Cause and result', body: 'because (+ clause), because of / due to (+ noun), therefore, as a result, so.', good: ['Sales fell because of the rain.', 'Sales fell. As a result, we changed the schedule.'], bad: ['Sales fell because the rain.'] },
      { h: 'Examples and conclusion', body: 'For example, For instance, such as / In conclusion, Overall, To sum up.', good: ['Some tools, such as chatbots, save time.', 'Overall, the benefits outweigh the drawbacks.'], bad: ['For example like chatbots.'] },
      { h: 'Punctuation with linkers', body: 'However, Therefore, Moreover start a new sentence (or follow a semicolon) and take a comma after them.', good: ['It was risky. However, we tried.', 'It was risky; however, we tried.'], bad: ['It was risky, however we tried.'] },
    ],
    trap: '"Walaupun … tetapi …" → use only ONE: "Although…" OR "…, but…".',
    id_sum: 'Kata penghubung membuat gagasan tersusun rapi dan bernilai tinggi dalam IELTS. Untuk menambahkan gunakan In addition atau Moreover; untuk pertentangan gunakan However, although, atau despite (+ nomina/-ing); untuk sebab-akibat gunakan because (+ klausa), because of (+ nomina), atau As a result. Jangan memakai "although" dan "but" sekaligus dalam satu kalimat. Kata However, Therefore, dan Moreover diletakkan di awal kalimat baru dan diikuti koma.',
    check: [
      { q: '___ the heavy traffic, we arrived on time.', o: ['Although', 'Despite', 'However'], a: 1, why: 'despite + noun' },
      { q: 'Choose the correct sentence.', o: ['Although it was late, but we finished.', 'Although it was late, we finished.', 'Despite it was late, we finished.'], a: 1, why: 'Use only one contrast word.' },
      { q: 'The event was cancelled ___ the storm.', o: ['because', 'because of', 'therefore'], a: 1, why: 'because of + noun' },
      { q: 'The tool is cheap. ___, it is easy to use.', o: ['However', 'In addition', 'Although'], a: 1, why: 'Adding an idea.' },
    ],
  },
  {
    id: 'sentence-boundaries', unit: 'u7', title: 'Sentence boundaries and punctuation', tags: ['sentence_structure', 'spelling'], mins: 8,
    why: 'Long Indonesian-style sentences joined by commas look like errors in English writing.',
    rules: [
      { h: 'Do not join two sentences with only a comma', body: 'Two complete sentences need a full stop, a semicolon, or a linking word.', good: ['I work at a gym. It opened in 2024.', 'I work at a gym, and it opened in 2024.'], bad: ['I work at a gym, it opened in 2024.'] },
      { h: 'Use a comma after an opening phrase', body: 'After introductory phrases and clauses, add a comma.', good: ['In my opinion, remote work is effective.', 'When I started, there were no SOPs.'], bad: [] },
      { h: 'Capital letters', body: 'Capitals for sentence starts, names, days, months, countries, nationalities and languages. Not for normal nouns in the middle of a sentence.', good: ['I work in operations at an indoor climbing gym.', 'I speak Indonesian and English.'], bad: ['I work in Operations at an Indoor Climbing Gym.', 'I speak indonesian.'] },
      { h: 'Spelling you often need', body: 'myself, facilities, grammar, responsibility, necessary, accommodation, schedule, colleague, environment, separate, receive.', good: ['facilities', 'myself', 'grammar'], bad: ['fasilities', 'my self', 'grammer'] },
    ],
    trap: 'In IELTS writing, spellcheck is off. Learn the words you use often.',
    id_sum: 'Dua kalimat lengkap tidak boleh digabung hanya dengan koma; gunakan titik, titik koma, atau kata penghubung. Berikan koma setelah frasa atau anak kalimat pembuka. Huruf kapital dipakai untuk awal kalimat, nama orang, hari, bulan, negara, kebangsaan, dan bahasa, tetapi tidak untuk nomina biasa di tengah kalimat.',
    check: [
      { q: 'Choose the correct sentence.', o: ['The gym is busy, we need more staff.', 'The gym is busy, so we need more staff.', 'The gym is busy so, we need more staff.'], a: 1, why: 'Use a linking word.' },
      { q: 'Correct spelling:', o: ['colleague', 'collegue', 'coleague'], a: 0, why: 'colleague' },
      { q: 'Choose the correct capitalisation.', o: ['I speak English and indonesian.', 'I speak English and Indonesian.', 'I Speak english and Indonesian.'], a: 1, why: 'Languages take capitals.' },
    ],
  },
  {
    id: 'register', unit: 'u7', title: 'Formal and informal English (emails and letters)', tags: ['word_choice'], mins: 10,
    why: 'IELTS General Task 1 and TOEFL "Write an Email" score you on the right tone. So do real employers.',
    rules: [
      { h: 'Openings and closings', body: 'Formal: Dear Mr Lee, / Dear Sir or Madam, … Yours sincerely, (name known) / Yours faithfully, (name unknown). Semi-formal: Dear Ms Tan, … Kind regards,. Informal: Hi Sam, … Best wishes, / Cheers,.', good: ['Dear Sir or Madam, … Yours faithfully,'], bad: ['Dear Mr Lee, … Yours faithfully, (mixing rules)'] },
      { h: 'Polite requests', body: 'Could you…? / Would it be possible to…? / I would appreciate it if you could… / I was wondering if…', good: ['Could you please send me the schedule?', 'I would appreciate it if you could confirm by Friday.'], bad: ['Send me the schedule.', 'Can you give me the schedule? (too direct in formal writing)'] },
      { h: 'Formal style', body: 'No contractions (do not, I am), no slang, full sentences, clear paragraphs: purpose → details → action → closing.', good: ['I am writing to request an extension.'], bad: ['I\'m writing coz I wanna ask for more time.'] },
      { h: 'Useful formal openers', body: 'I am writing to enquire about… / I am writing to complain about… / I am writing to apply for… / Thank you for your email regarding…', good: ['I am writing to apply for the position of Operations Supervisor.'], bad: ['I want to tell you that I apply the position.'] },
    ],
    trap: '"Mohon dibantu" → "I would appreciate your help with…", not "Please be helped."',
    id_sum: 'Sesuaikan ragam bahasa dengan penerima. Surat resmi diawali "Dear Mr/Ms + nama" dan ditutup "Yours sincerely", atau diawali "Dear Sir or Madam" dan ditutup "Yours faithfully". Permintaan yang sopan memakai "Could you…?" atau "I would appreciate it if you could…". Dalam tulisan resmi, hindari singkatan (contractions) dan bahasa gaul, serta susun paragraf secara jelas: tujuan, rincian, permintaan tindakan, dan penutup.',
    check: [
      { q: 'You don\'t know the reader\'s name. Close the letter with:', o: ['Yours sincerely,', 'Yours faithfully,', 'Cheers,'], a: 1, why: 'Dear Sir or Madam → Yours faithfully.' },
      { q: 'The most polite request is:', o: ['Send me the file.', 'I would appreciate it if you could send me the file.', 'You must send me the file.'], a: 1, why: 'Indirect, polite form.' },
      { q: 'A good formal opening sentence is:', o: ['I\'m writing coz I need info.', 'I am writing to enquire about your evening course.', 'Hi, what about the course?'], a: 1, why: 'Formal, clear purpose.' },
    ],
  },
];

export const LESSON = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

// error category → most relevant lesson
export const CATEGORY_LESSON = {
  verb_form: 'verb-patterns', tense: 'past-perfect', article: 'articles', preposition: 'in-on-at-place',
  agreement: 'agreement', word_choice: 'indonesian-transfer', l1_transfer: 'indonesian-transfer',
  sentence_structure: 'sentence-core', spelling: 'sentence-boundaries', other: 'sentence-core',
};
