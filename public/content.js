// English Command — content bank (general IELTS + TOEFL, not job-specific)

export const CATEGORIES = {
  verb_form: { name: 'Verb forms', hint: 'Base verb after to / modals; -ing after prepositions; correct participles.' },
  tense: { name: 'Tenses', hint: 'Keep tenses consistent; present perfect vs past simple.' },
  article: { name: 'Articles', hint: 'a / an / the before singular countable nouns.' },
  preposition: { name: 'Prepositions', hint: 'in / on / at, and fixed verb + preposition pairs.' },
  agreement: { name: 'Subject–verb agreement', hint: 'Subject and verb must match (he works / they work).' },
  word_choice: { name: 'Word choice', hint: 'Words that look right but mean something else.' },
  l1_transfer: { name: 'Indonesian transfer', hint: 'Indonesian structures translated word by word.' },
  sentence_structure: { name: 'Sentence structure', hint: 'Missing subjects/objects, run-ons, word order.' },
  spelling: { name: 'Spelling', hint: 'Spelling mistakes (writing only).' },
  other: { name: 'Other', hint: 'Other errors.' },
};

// ---------- Error drills (offline, no AI cost) ----------
export const DRILLS = {
  verb_form: [
    { q: 'I want to ___ more about how other countries run operations.', o: ['learning', 'learn', 'learned'], a: 1, why: 'to + base verb.' },
    { q: 'She is interested in ___ abroad next year.', o: ['work', 'to work', 'working'], a: 2, why: 'Preposition + -ing.' },
    { q: 'You should ___ your answer before you submit it.', o: ['checking', 'check', 'to check'], a: 1, why: 'Modal + base verb.' },
    { q: 'I have ___ a lot from this project.', o: ['learn', 'learning', 'learned'], a: 2, why: 'have + past participle.' },
    { q: 'He avoided ___ the same mistake twice.', o: ['making', 'to make', 'make'], a: 0, why: 'avoid + -ing.' },
    { q: 'I look forward to ___ from you.', o: ['hear', 'hearing', 'heard'], a: 1, why: '"to" is a preposition here: look forward to + -ing.' },
    { q: 'They decided ___ the meeting.', o: ['postponing', 'to postpone', 'postpone'], a: 1, why: 'decide + to + base verb.' },
    { q: 'I am used to ___ under pressure.', o: ['work', 'working', 'worked'], a: 1, why: 'be used to + -ing.' },
  ],
  tense: [
    { q: 'I ___ in this company since 2024.', o: ['work', 'have worked', 'worked'], a: 1, why: 'since + present perfect.' },
    { q: 'Last year, we ___ a national competition.', o: ['have organised', 'organise', 'organised'], a: 2, why: 'Finished time (last year) = past simple.' },
    { q: 'By the time I arrived, the meeting ___.', o: ['already started', 'had already started', 'has already started'], a: 1, why: 'Earlier past action = past perfect.' },
    { q: 'If I ___ more time, I would study every day.', o: ['have', 'had', 'will have'], a: 1, why: 'Second conditional: if + past.' },
    { q: 'Right now, I ___ for the IELTS test.', o: ['prepare', 'am preparing', 'prepared'], a: 1, why: 'Action in progress = present continuous.' },
    { q: 'I ___ to Singapore twice.', o: ['have been', 'went', 'go'], a: 0, why: 'Life experience, no time given = present perfect.' },
  ],
  article: [
    { q: 'I work as ___ operations supervisor.', o: ['a', 'an', 'the'], a: 1, why: '"an" before a vowel sound.' },
    { q: 'It is ___ indoor climbing gym in Jakarta.', o: ['—', 'a', 'an'], a: 2, why: 'Singular countable noun + vowel sound.' },
    { q: '___ internet has changed how we learn.', o: ['The', 'A', '—'], a: 0, why: 'Unique thing = the.' },
    { q: 'She is ___ honest person.', o: ['a', 'an', 'the'], a: 1, why: 'Silent h = vowel sound.' },
    { q: 'I need ___ advice about my career.', o: ['an', 'some', 'a'], a: 1, why: '"Advice" is uncountable.' },
    { q: 'He goes to ___ work by train.', o: ['the', 'a', '—'], a: 2, why: 'Fixed phrase: go to work.' },
    { q: 'It was ___ best decision I have ever made.', o: ['a', 'the', '—'], a: 1, why: 'Superlative = the.' },
    { q: 'I bought ___ new laptop. ___ laptop is very fast.', o: ['a / The', 'the / A', 'a / A'], a: 0, why: 'First mention a, second mention the.' },
  ],
  preposition: [
    { q: 'I work ___ a large logistics company.', o: ['in', 'at', 'on'], a: 1, why: 'Work at + company/workplace.' },
    { q: 'The meeting is ___ Monday ___ 9 a.m.', o: ['on / at', 'in / on', 'at / in'], a: 0, why: 'on + day, at + clock time.' },
    { q: 'I was born ___ 2001.', o: ['on', 'at', 'in'], a: 2, why: 'in + year.' },
    { q: 'She is responsible ___ staff scheduling.', o: ['for', 'of', 'to'], a: 0, why: 'responsible for.' },
    { q: 'It depends ___ the situation.', o: ['of', 'on', 'from'], a: 1, why: 'depend on.' },
    { q: 'I want to work ___.', o: ['in overseas', 'overseas', 'at overseas'], a: 1, why: '"Overseas" needs no preposition.' },
    { q: 'He is good ___ solving problems.', o: ['in', 'at', 'on'], a: 1, why: 'good at + -ing.' },
    { q: 'We discussed ___ the new policy.', o: ['about', '—', 'on'], a: 1, why: '"Discuss" takes a direct object.' },
  ],
  agreement: [
    { q: 'What ___ the most important things?', o: ['is', 'are', 'be'], a: 1, why: 'Plural subject "things" = are.' },
    { q: 'Everyone ___ a role in the team.', o: ['have', 'has', 'having'], a: 1, why: '"Everyone" is singular.' },
    { q: 'The number of tourists ___ increasing.', o: ['are', 'is', 'were'], a: 1, why: '"The number of" = singular.' },
    { q: 'My manager and I ___ the schedule every week.', o: ['reviews', 'review', 'reviewing'], a: 1, why: 'Two subjects = plural.' },
    { q: 'One of my responsibilities ___ hiring part-time staff.', o: ['are', 'is', 'were being'], a: 1, why: 'Subject is "one".' },
    { q: 'He ___ English every day.', o: ['practise', 'practises', 'practising'], a: 1, why: 'He/she/it + -s.' },
  ],
  word_choice: [
    { q: 'I want to ___ what I learned to my new company.', o: ['elaborate', 'apply', 'commute'], a: 1, why: 'Elaborate = explain in detail.' },
    { q: 'Working abroad lets me ___ with professionals from many countries.', o: ['commute', 'connect', 'collaborate to'], a: 1, why: 'Commute = travel to work.' },
    { q: 'The new system ___ the waiting time by 30%.', o: ['decreased', 'reduced', 'lessened down'], a: 1, why: 'reduce + object is the natural collocation.' },
    { q: 'I have a lot of ___ in event management.', o: ['experiences', 'experience', 'experiencing'], a: 1, why: 'Skill/knowledge = uncountable "experience".' },
    { q: 'This decision will ___ a big impact on staff.', o: ['give', 'make', 'have'], a: 2, why: 'have an impact (on).' },
    { q: 'Could you ___ me how to use this tool?', o: ['explain', 'tell', 'say'], a: 1, why: 'tell someone how; explain TO someone.' },
  ],
  l1_transfer: [
    { q: 'Padanan yang wajar untuk "memberikan kontribusi":', o: ['give contribution', 'contribute', 'make contribute'], a: 1, why: 'Use the verb "contribute".' },
    { q: 'Padanan yang wajar untuk "uraian tugas" (sering disebut "jobdesk"):', o: ['job desk', 'responsibilities', 'job desks'], a: 1, why: '"Jobdesk" is not an English word.' },
    { q: '"Saya ingin tahu bagaimana..." =', o: ['I want to know about how...', 'I want to know how...', 'I want know how...'], a: 1, why: 'know how (no "about").' },
    { q: '"Dia sudah menikah" =', o: ['She already married.', 'She is already married.', 'She has married already.'], a: 1, why: 'married is an adjective here: be married.' },
    { q: '"Saya setuju dengan Anda" =', o: ['I am agree with you.', 'I agree with you.', 'I agreed with you now.'], a: 1, why: '"agree" is a verb; no "am".' },
    { q: '"Mohon kirimkan kepada saya..." (permintaan sopan) =', o: ['Can you give me...', 'Could you please send me...', 'You can give me...'], a: 1, why: 'Could you please... is polite and natural.' },
    { q: '"Mari kita bahas hal itu besok." =', o: ['We discuss about it tomorrow.', 'Let\'s discuss it tomorrow.', 'We will discussion tomorrow.'], a: 1, why: 'discuss + object, no "about".' },
  ],
  sentence_structure: [
    { q: 'Choose the correct sentence:', o: ['Is very important to practise.', 'It is very important to practise.', 'Very important practise.'], a: 1, why: 'English needs a subject: It is...' },
    { q: 'Choose the correct sentence:', o: ['You can create it using any information.', 'You can create with any information.', 'Can create it any information.'], a: 0, why: 'Keep the object (it).' },
    { q: 'Choose the correct question:', o: ['Where you work?', 'Where do you work?', 'Where are you work?'], a: 1, why: 'Question = do + subject + verb.' },
    { q: 'Choose the correct sentence:', o: ['I don\'t know where is the office.', 'I don\'t know where the office is.', 'I don\'t know where office is.'], a: 1, why: 'Embedded question = normal word order.' },
    { q: 'Choose the best sentence:', o: ['I like it, I will try it again.', 'I liked it, so I will try it again.', 'I like it I will try it again.'], a: 1, why: 'Join clauses with a conjunction.' },
  ],
  spelling: [
    { q: 'Correct spelling:', o: ['facilities', 'fasilities', 'facilites'], a: 0, why: 'facilities' },
    { q: 'Correct spelling:', o: ['grammer', 'grammar', 'gramar'], a: 1, why: 'grammar' },
    { q: 'Correct spelling:', o: ['my self', 'myself', 'mysself'], a: 1, why: 'one word' },
    { q: 'Correct spelling:', o: ['responsibility', 'responsibilty', 'responsability'], a: 0, why: 'responsibility' },
    { q: 'Correct spelling:', o: ['accommodation', 'accomodation', 'acommodation'], a: 0, why: 'double c, double m' },
    { q: 'Correct spelling:', o: ['necessary', 'neccessary', 'necesary'], a: 0, why: 'one c, double s' },
  ],
};

// ---------- TOEFL Listen & Repeat (E) ----------
export const REPEAT = [
  'Please take a seat.',
  'The library opens at nine.',
  'Could you send me the file?',
  'The meeting has been moved to Friday.',
  'Remember to bring your student card.',
  'The shuttle bus leaves every twenty minutes.',
  'I left my umbrella in the conference room.',
  'The new schedule will start next Monday.',
  'Please check in at the front desk before the tour.',
  'The workshop is free for all registered members.',
  'Our team finished the project two days early.',
  'Visitors must wear a badge at all times.',
  'The café on the second floor closes at six.',
  'If you have any questions, ask a member of staff.',
  'The training session was more useful than I expected.',
  'We need to reduce waiting times during peak hours.',
  'You can return the equipment at the main entrance.',
  'The report should be submitted by the end of the week.',
  'Most customers prefer to book their sessions online.',
  'The museum offers guided tours in several languages.',
  'Before you leave, please make sure all the windows are closed.',
  'The professor asked us to read the first two chapters.',
  'Our main goal this quarter is to improve customer satisfaction.',
  'The parking area behind the building is reserved for staff.',
  'Anyone who wants to join the trip should sign up by Thursday.',
  'The results of the survey will be shared at the next meeting.',
  'Due to maintenance, the elevator will be out of service until noon.',
  'Students who miss the deadline will need to contact their advisor.',
  'The city has invested heavily in public transport over the last decade.',
  'Although the weather was bad, the event attracted a large crowd.',
];

// ---------- TOEFL Build a Sentence (E) ----------
export const BUILD = [
  { ctx: 'Did you finish the report?', ans: 'I will send it to you this afternoon' },
  { ctx: 'Where is the meeting?', ans: 'it has been moved to the second floor' },
  { ctx: 'Why were you late?', ans: 'the train was delayed because of the rain' },
  { ctx: 'What did the manager say?', ans: 'she asked us to update the schedule' },
  { ctx: 'Do you know where the library is?', ans: 'it is next to the main entrance' },
  { ctx: 'How was the workshop?', ans: 'it was more useful than I expected' },
  { ctx: 'Can I borrow your notes?', ans: 'I can email them to you tonight' },
  { ctx: 'What do you want to improve?', ans: 'I want to speak more fluently' },
  { ctx: 'Have you ever been abroad?', ans: 'I have never travelled outside my country' },
  { ctx: 'When does the course start?', ans: 'it starts on the first of December' },
  { ctx: 'Is the café still open?', ans: 'I think it closes in ten minutes' },
  { ctx: 'Who is responsible for the event?', ans: 'the operations team is in charge of it' },
  { ctx: 'Did the customer accept the offer?', ans: 'he said he needed more time to decide' },
  { ctx: 'Why did you choose this job?', ans: 'I enjoy solving problems with my team' },
  { ctx: 'Could you help me with this form?', ans: 'of course let me take a look at it' },
  { ctx: 'What happened to the printer?', ans: 'someone is coming to repair it tomorrow' },
  { ctx: 'Are you ready for the test?', ans: 'I have been practising every day this month' },
  { ctx: 'Do you know what the professor wants?', ans: 'she wants us to compare the two theories' },
  { ctx: 'How long have you lived here?', ans: 'I have lived here since I graduated' },
  { ctx: 'Should we book the room now?', ans: 'it would be better to wait until Friday' },
];

// ---------- IELTS Speaking Part 1 (D) ----------
export const PART1 = [
  { topic: 'Work', qs: ['Do you work or are you a student?', 'What do you like most about your job?', 'Is there anything you would like to change about your work?', 'Would you like to do a different job in the future?'] },
  { topic: 'Hometown', qs: ['Where is your hometown?', 'What do you like about it?', 'Has it changed much since you were a child?', 'Would you like to live there in the future?'] },
  { topic: 'Mornings', qs: ['Do you prefer mornings or evenings?', 'What do you usually do in the morning?', 'Did you have the same routine when you were a child?', 'How could you make your mornings more productive?'] },
  { topic: 'Technology', qs: ['How often do you use your phone?', 'Which app do you use the most?', 'Do you think people spend too much time online?', 'Has technology made your life easier?'] },
  { topic: 'Food', qs: ['What is your favourite food?', 'Do you prefer eating at home or eating out?', 'Can you cook?', 'Is there any food you did not like as a child?'] },
  { topic: 'Weekends', qs: ['What do you usually do at weekends?', 'Do you prefer busy or relaxing weekends?', 'What did you do last weekend?', 'Are weekends different now compared to when you were younger?'] },
  { topic: 'Music', qs: ['Do you like music?', 'What kind of music do you listen to?', 'Can you play a musical instrument?', 'Is music important in your culture?'] },
  { topic: 'Transport', qs: ['How do you usually get to work?', 'Do you like using public transport?', 'What is the main transport problem in your city?', 'How will transport change in the future?'] },
  { topic: 'Learning', qs: ['Are you learning anything at the moment?', 'Do you prefer learning alone or with others?', 'What is the most useful thing you have ever learned?', 'Is it easier to learn new things as a child or as an adult?'] },
  { topic: 'Friends', qs: ['Do you have a lot of friends?', 'How often do you meet your friends?', 'What do you usually do together?', 'Is it easy to make new friends as an adult?'] },
  { topic: 'Weather', qs: ['What is the weather like where you live?', 'What is your favourite kind of weather?', 'Does the weather affect your mood?', 'Would you like to live in a colder country?'] },
  { topic: 'Reading', qs: ['Do you like reading?', 'What kind of things do you read?', 'Do you prefer paper books or e-books?', 'Did you read a lot when you were a child?'] },
];

// ---------- TOEFL Take an Interview (D) ----------
export const INTERVIEW = [
  { context: 'A researcher is asking about study habits.', qs: ['How do you usually prepare for an important test?', 'Do you prefer studying in the morning or at night? Why?', 'What is the biggest distraction when you study?', 'Some people say group study is a waste of time. What do you think?'] },
  { context: 'A researcher is asking about technology at work.', qs: ['What technology do you use most in your daily work?', 'Has technology made your job easier or harder?', 'Should companies limit how much employees use their phones?', 'Will AI replace many jobs in the next ten years? Explain.'] },
  { context: 'A researcher is asking about cities.', qs: ['What do you like about the city where you live?', 'What is one thing you would change about it?', 'Should cities spend more on parks or on roads?', 'Would you rather live in a big city or a small town in the future?'] },
  { context: 'A researcher is asking about health and lifestyle.', qs: ['What do you do to stay healthy?', 'Is it difficult to keep a healthy lifestyle with a busy job?', 'Should schools teach students how to cook?', 'Should the government tax unhealthy food?'] },
  { context: 'A researcher is asking about travel.', qs: ['What is the most interesting place you have visited?', 'Do you prefer travelling alone or with others?', 'How has tourism affected your country?', 'Should famous tourist sites limit the number of visitors?'] },
  { context: 'A researcher is asking about the environment.', qs: ['What do you personally do to protect the environment?', 'Is plastic waste a big problem where you live?', 'Should individuals or companies do more to fight climate change?', 'Would you pay more for products that are environmentally friendly?'] },
  { context: 'A researcher is asking about work and careers.', qs: ['What skills are most important in your field?', 'Would you prefer a high salary or a good work-life balance?', 'Is it a good idea to change careers after age thirty?', 'Should companies allow employees to work from home?'] },
  { context: 'A researcher is asking about learning languages.', qs: ['Why are you learning English?', 'What is the hardest part of learning English for you?', 'Should children start learning a second language at primary school?', 'Will translation apps make learning languages unnecessary?'] },
];

// ---------- IELTS Speaking Part 2 cue cards (C) ----------
export const PART2 = [
  { title: 'Describe a skill you learned that was difficult at first.', b: ['what the skill is', 'when and how you learned it', 'why it was difficult', 'and explain how you feel about it now.'] },
  { title: 'Describe a time you solved a problem at work or school.', b: ['what the problem was', 'who was involved', 'what you did', 'and explain what you learned from it.'] },
  { title: 'Describe a place you would like to visit in the future.', b: ['where it is', 'how you know about it', 'what you would do there', 'and explain why you want to go there.'] },
  { title: 'Describe a person who has influenced you.', b: ['who the person is', 'how you know them', 'what they did', 'and explain how they influenced you.'] },
  { title: 'Describe an important decision you made.', b: ['what the decision was', 'when you made it', 'what options you had', 'and explain why it was important.'] },
  { title: 'Describe a piece of technology you find useful.', b: ['what it is', 'when you started using it', 'how you use it', 'and explain why it is useful to you.'] },
  { title: 'Describe a goal you want to achieve.', b: ['what the goal is', 'why you set it', 'what you are doing to achieve it', 'and explain how you will feel when you achieve it.'] },
  { title: 'Describe a time you worked in a team.', b: ['what the task was', 'who was in the team', 'what your role was', 'and explain whether it was successful.'] },
  { title: 'Describe an event you organised or helped to organise.', b: ['what the event was', 'when and where it happened', 'what you did', 'and explain how you felt about the result.'] },
  { title: 'Describe a book, film or series that made you think.', b: ['what it was', 'when you saw or read it', 'what it was about', 'and explain why it made you think.'] },
  { title: 'Describe a time you received good advice.', b: ['who gave you the advice', 'what the advice was', 'whether you followed it', 'and explain why it was good advice.'] },
  { title: 'Describe a change that would improve your city.', b: ['what the change is', 'how it could be done', 'who would benefit', 'and explain why it would be an improvement.'] },
];

// ---------- IELTS Speaking Part 3 (B) ----------
export const PART3 = [
  { theme: 'Work and careers', qs: ['Why do some people change careers several times?', 'Is job security more important than job satisfaction?', 'How will the workplace change in the next twenty years?', 'Should employers pay for employees\' training?'] },
  { theme: 'Education', qs: ['Is university education necessary for success?', 'How has technology changed the way people learn?', 'Should education focus more on practical skills?', 'Who should pay for higher education: students or the government?'] },
  { theme: 'Technology and society', qs: ['Has social media made people more or less connected?', 'What are the dangers of relying too much on technology?', 'Should children be allowed to use smartphones?', 'How can governments protect people\'s privacy online?'] },
  { theme: 'Environment', qs: ['Why do many people not change their behaviour to protect the environment?', 'Is it the responsibility of individuals or governments to reduce pollution?', 'How can cities become more environmentally friendly?', 'Will future generations live better or worse than us?'] },
  { theme: 'Globalisation and travel', qs: ['What are the benefits of working in another country?', 'Do international companies help or harm local businesses?', 'Is it important to keep traditional culture in a globalised world?', 'How does mass tourism affect local communities?'] },
  { theme: 'Health', qs: ['Why are lifestyle diseases increasing in many countries?', 'Should healthcare be free for everyone?', 'Is it the individual\'s responsibility to stay healthy?', 'How can companies support employees\' mental well-being?'] },
  { theme: 'Leadership and teamwork', qs: ['What makes a good leader?', 'Are leaders born or made?', 'Why do some teams fail even with talented members?', 'Should young people be given leadership roles?'] },
  { theme: 'Cities and housing', qs: ['Why do so many people move from rural areas to cities?', 'What problems does rapid urban growth cause?', 'Should governments control housing prices?', 'What will cities look like in fifty years?'] },
  { theme: 'Money and consumerism', qs: ['Why do people buy things they do not need?', 'Should schools teach financial skills?', 'Does advertising have too much influence on young people?', 'Is it better to save money or to spend it on experiences?'] },
  { theme: 'Communication', qs: ['Has the internet improved the way people communicate?', 'Why do misunderstandings happen at work?', 'Is face-to-face communication still important?', 'How important is it to speak more than one language today?'] },
];

// ---------- TOEFL Write an Email (D) ----------
export const EMAIL = [
  { s: 'You recently joined a gym, but the class you signed up for was cancelled twice without notice.', p: ['explain what happened', 'say how it affected you', 'suggest what the gym should do'], to: 'the gym manager' },
  { s: 'Your professor has given an assignment deadline that clashes with an important family event.', p: ['explain the situation', 'ask for an extension', 'propose a new deadline'], to: 'your professor' },
  { s: 'A colleague helped you finish an urgent project last week.', p: ['thank them', 'describe how their help made a difference', 'offer something in return'], to: 'your colleague' },
  { s: 'You ordered a product online, but you received the wrong item.', p: ['describe the problem', 'explain what you ordered', 'say what you want the company to do'], to: 'customer service' },
  { s: 'Your neighbour often plays loud music late at night.', p: ['describe the problem politely', 'explain how it affects you', 'suggest a solution'], to: 'your neighbour' },
  { s: 'You want to join a volunteer programme at a local community centre.', p: ['introduce yourself', 'explain why you want to join', 'ask about the schedule'], to: 'the programme coordinator' },
  { s: 'Your manager asked for ideas to reduce waiting times for customers.', p: ['describe the current problem', 'suggest two ideas', 'explain the expected result'], to: 'your manager' },
  { s: 'A study group you belong to keeps missing its meetings.', p: ['describe the problem', 'explain why it matters', 'propose a fixed schedule'], to: 'the group members' },
];

// ---------- IELTS General Training Task 1 letters (C) ----------
export const LETTERS = [
  { s: 'You recently stayed at a hotel and left a personal item in your room.', p: ['describe the item', 'explain where you think you left it', 'say how you would like it returned'], tone: 'formal' },
  { s: 'Your company is planning to change working hours, and you are worried.', p: ['explain the planned change', 'describe how it will affect you', 'suggest an alternative'], tone: 'formal' },
  { s: 'A friend is coming to visit your city for the first time.', p: ['suggest when to come', 'recommend places to visit', 'offer help with accommodation'], tone: 'informal' },
  { s: 'You want to take a short course at a local college but need more information.', p: ['say which course you are interested in', 'explain why', 'ask for the information you need'], tone: 'semi-formal' },
  { s: 'You have seen an advertisement for a job that interests you.', p: ['say which job you are applying for', 'describe your relevant experience', 'explain why you are suitable'], tone: 'formal' },
  { s: 'The public park near your home is in poor condition.', p: ['describe the problems', 'explain why the park matters to residents', 'suggest improvements'], tone: 'formal' },
  { s: 'You borrowed something from a friend and accidentally damaged it.', p: ['explain what happened', 'apologise', 'say what you will do about it'], tone: 'informal' },
  { s: 'Your landlord has not repaired a problem in your apartment.', p: ['describe the problem', 'explain what you have already done', 'say what you want the landlord to do'], tone: 'formal' },
];

// ---------- TOEFL Academic Discussion (C) ----------
export const DISCUSSION = [
  { prof: 'This week we are discussing work. Some companies now allow employees to work from home permanently. Do you think this is good for companies in the long term? Why or why not?', a: ['Maya', 'Working from home saves companies money on office space, and employees are often more productive without a long commute.'], b: ['Daniel', 'I disagree. Teams lose the informal conversations that create new ideas, and new employees find it hard to learn from experienced colleagues.'] },
  { prof: 'Cities are growing quickly. Should governments spend more money on public transport or on building new roads? Explain your view.', a: ['Lena', 'Public transport is better because it reduces traffic and pollution at the same time.'], b: ['Omar', 'In many cities, buses still use roads, so improving roads helps everyone, including public transport users.'] },
  { prof: 'Many universities now use AI tools in teaching. Is AI more helpful or harmful for students\' learning?', a: ['Priya', 'AI can give students instant feedback, which helps them learn faster.'], b: ['Tom', 'If students use AI to do their work, they will never develop real thinking skills.'] },
  { prof: 'Should schools require students to do community service before they graduate? Why or why not?', a: ['Sara', 'Community service teaches responsibility and helps students understand real social problems.'], b: ['Kenji', 'Forced volunteering is not real volunteering. Students should choose how to spend their time.'] },
  { prof: 'Tourism brings money but also problems. Should popular destinations limit the number of tourists?', a: ['Ana', 'Yes. Too many visitors damage the environment and make life difficult for local residents.'], b: ['Leo', 'Limiting tourists would hurt small businesses that depend on visitors to survive.'] },
  { prof: 'Is it better for young professionals to stay in one company for a long time or to change jobs every few years?', a: ['Rina', 'Staying longer builds trust and leads to bigger responsibilities.'], b: ['Marcus', 'Changing jobs helps people learn faster and usually leads to higher salaries.'] },
];

// ---------- IELTS Writing Task 2 (B / S) ----------
export const TASK2 = [
  'Some people believe that working abroad is the best way to develop a career. Others think it is better to build experience in one\'s own country. Discuss both views and give your own opinion.',
  'Many companies now use artificial intelligence to do tasks that were done by people. Do the advantages of this development outweigh the disadvantages?',
  'Some people think that university education should be free for everyone. To what extent do you agree or disagree?',
  'In many countries, people are working longer hours than before. What are the causes of this, and what can be done to solve the problem?',
  'Some people say that the best way to reduce traffic in cities is to make public transport free. To what extent do you agree or disagree?',
  'Social media has changed the way people communicate. Is this a positive or negative development?',
  'Governments should spend more money on protecting the environment than on developing new technology. To what extent do you agree or disagree?',
  'Some people believe that employers should only care about a candidate\'s skills, not their qualifications. Discuss both views and give your own opinion.',
  'International tourism has grown rapidly. What problems does this cause, and how can they be solved?',
  'Children today spend less time outdoors than in the past. Why is this happening, and what are the effects?',
  'Some people think that a good leader is born, while others believe that leadership can be learned. Discuss both views and give your own opinion.',
  'More and more people are choosing to live alone. What are the reasons for this trend, and is it a positive or negative development?',
];

// ---------- IELTS Academic Task 1 (A, extra) ----------
export const ACADEMIC_T1 = [
  { title: 'The table shows the percentage of people using different types of transport to get to work in one city in 2005 and 2025.', data: 'Transport | 2005 | 2025\nCar | 52% | 38%\nBus | 25% | 22%\nTrain | 10% | 21%\nBicycle | 5% | 11%\nWalking | 8% | 8%' },
  { title: 'The table shows the number of international visitors (in millions) to four countries between 2015 and 2025.', data: 'Country | 2015 | 2020 | 2025\nCountry A | 12 | 4 | 15\nCountry B | 8 | 3 | 11\nCountry C | 20 | 6 | 18\nCountry D | 5 | 2 | 9' },
  { title: 'The table shows average weekly working hours and average weekly leisure hours for workers in five age groups.', data: 'Age | Work (hrs) | Leisure (hrs)\n20-29 | 44 | 22\n30-39 | 47 | 17\n40-49 | 46 | 18\n50-59 | 41 | 23\n60+ | 25 | 40' },
  { title: 'The table shows how households in one country spent their income in 2000 and 2025 (percentage of total spending).', data: 'Category | 2000 | 2025\nHousing | 24% | 33%\nFood | 30% | 21%\nTransport | 14% | 15%\nTechnology | 3% | 10%\nEntertainment | 9% | 8%\nOther | 20% | 13%' },
];

// ---------- Operations interview (A) — general, not industry-specific ----------
export const STAR = [
  'Tell me about yourself and why you want to work abroad.',
  'Describe a process you improved. What was the result?',
  'Tell me about a time you handled a difficult customer or stakeholder.',
  'Give an example of a time you had to make a decision with incomplete information.',
  'Describe a time you managed a team through a busy or stressful period.',
  'Tell me about a mistake you made at work and what you learned from it.',
  'How do you prioritise when everything seems urgent?',
  'Describe a time you introduced a new tool or system and people resisted it.',
  'Tell me about a time you had a conflict with a colleague. How did you resolve it?',
  'How would you measure whether an operation is running well?',
  'Describe a time you had to train or develop a team member.',
  'Where do you see yourself in five years, and how does this role fit that plan?',
];

// ---------- Teaching English (general + classroom) ----------
export const TEACH_EXPLAIN = [
  'Explain to a 12-year-old student the difference between "much" and "many", with two examples each.',
  'Explain to a beginner when we use "a" and when we use "an". Give three examples.',
  'Explain to a student how to form the past simple of regular verbs, and give two irregular examples.',
  'Explain to a student the difference between "in", "on" and "at" for time, with one example each.',
  'Explain to a student why we say "She works" but "They work".',
  'Explain the difference between "bored" and "boring" to a teenager, using a story from school.',
];
export const TEACH_CLASS = [
  'Start a lesson: greet the class, explain today\'s goal, and give the first instruction for a pair activity.',
  'Give clear instructions for a group task: students make a poster about healthy food in 15 minutes.',
  'A student keeps talking during the lesson. Speak to the class to bring their attention back politely.',
  'Close a lesson: summarise what students learned, set homework, and say goodbye.',
  'Give feedback to a student who answered incorrectly, in a kind and encouraging way.',
];
export const TEACH_EMAIL = [
  { s: 'A student has missed three lessons this month.', p: ['tell the parent what happened', 'explain why attendance matters', 'suggest a meeting time'], to: 'the student\'s parent' },
  { s: 'Your class is going on a short field trip next Friday.', p: ['explain where and when', 'list what students must bring', 'ask for a signed permission form'], to: 'all parents' },
  { s: 'A student has improved a lot in English this term.', p: ['share the good news', 'give one specific example', 'suggest how to keep practising at home'], to: 'the student\'s parent' },
  { s: 'You need to borrow a projector from another teacher for one week.', p: ['explain why you need it', 'say when you will return it', 'thank them'], to: 'a colleague' },
];

// ---------- Practice tasks (rank letter = level: E Foundation ... S Exam simulation) ----------
// mode: 'repeat' | 'build' (scored offline) | 'ai' (scored by the AI examiner)
export const GATES = [
  { id: 'toefl-repeat', rank: 'E', skill: 'speaking', exam: 'TOEFL', mode: 'repeat', title: 'Listen & Repeat', desc: 'Hear 7 sentences, repeat each one exactly. Scored on your device.', mins: 6 },
  { id: 'toefl-build', rank: 'E', skill: 'writing', exam: 'TOEFL', mode: 'build', title: 'Build a sentence', desc: 'Arrange 8 word sets into correct replies. Scored on your device.', mins: 6 },
  { id: 'ielts-p1', rank: 'D', skill: 'speaking', exam: 'IELTS', mode: 'ai', title: 'Speaking Part 1', desc: '4 short questions on a familiar topic. Aim for 2-4 sentences each.', mins: 5, perQ: 40 },
  { id: 'toefl-interview', rank: 'D', skill: 'speaking', exam: 'TOEFL', mode: 'ai', title: 'Take an interview', desc: '4 interview questions, about 45 seconds each.', mins: 5, perQ: 45 },
  { id: 'toefl-email', rank: 'D', skill: 'writing', exam: 'TOEFL', mode: 'ai', title: 'Write an email', desc: 'Cover all 3 points. Target: 7 minutes, 80-150 words.', mins: 7, minWords: 80 },
  { id: 'ielts-p2', rank: 'C', skill: 'speaking', exam: 'IELTS', mode: 'ai', title: 'Speaking Part 2 (cue card)', desc: '1 minute to prepare, then speak for up to 2 minutes.', mins: 4, prep: 60, perQ: 120 },
  { id: 'ielts-gt1', rank: 'C', skill: 'writing', exam: 'IELTS GT', mode: 'ai', title: 'Writing Task 1 (letter)', desc: 'Write at least 150 words in 20 minutes.', mins: 20, minWords: 150 },
  { id: 'toefl-discussion', rank: 'C', skill: 'writing', exam: 'TOEFL', mode: 'ai', title: 'Academic discussion', desc: 'Contribute your own view. Target: 10 minutes, 100+ words.', mins: 10, minWords: 100 },
  { id: 'ielts-p3', rank: 'B', skill: 'speaking', exam: 'IELTS', mode: 'ai', title: 'Speaking Part 3', desc: '4 abstract questions. Give reasons, examples and a conclusion.', mins: 6, perQ: 60 },
  { id: 'ielts-task2', rank: 'B', skill: 'writing', exam: 'IELTS', mode: 'ai', title: 'Writing Task 2 (essay)', desc: 'Write at least 250 words in 40 minutes.', mins: 40, minWords: 250 },
  { id: 'ops-interview', rank: 'A', skill: 'speaking', exam: 'Job Interview', mode: 'ai', title: 'Operations interview (STAR)', desc: '3 interview questions. Use Situation, Task, Action, Result. Up to 2 minutes each.', mins: 7, perQ: 120 },
  { id: 'ielts-ac1', rank: 'A', skill: 'writing', exam: 'IELTS Academic', mode: 'ai', title: 'Academic Task 1 (data)', desc: 'Summarise the table in at least 150 words in 20 minutes.', mins: 20, minWords: 150 },
  { id: 'mock-speaking', rank: 'S', skill: 'speaking', exam: 'IELTS', mode: 'ai', title: 'Full speaking mock', desc: 'Part 1 (3 Qs) + Part 2 (cue card) + Part 3 (3 Qs) in one run.', mins: 14 },
  { id: 'teach-explain', rank: 'D', skill: 'speaking', exam: 'Teaching', mode: 'ai', title: 'Explain a grammar point', desc: 'Explain a rule to a student simply, with examples. Up to 2 minutes.', mins: 4, perQ: 120 },
  { id: 'teach-class', rank: 'C', skill: 'speaking', exam: 'Teaching', mode: 'ai', title: 'Classroom language', desc: 'Give instructions or feedback to a class. Up to 90 seconds each, 2 situations.', mins: 5, perQ: 90 },
  { id: 'teach-email', rank: 'C', skill: 'writing', exam: 'Teaching', mode: 'ai', title: 'Email to parents or colleagues', desc: 'A clear, polite school email. Target: 10 minutes, 100+ words.', mins: 10, minWords: 100 },
  { id: 'mock-writing', rank: 'S', skill: 'writing', exam: 'IELTS', mode: 'ai', title: 'Exam-mode essay', desc: 'Task 2 under strict exam rules: 40 minutes, no pausing, 250+ words.', mins: 40, minWords: 250, strict: true },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

// Build a concrete task (questions or writing prompt).
export function makeTask(gate) {
  switch (gate.id) {
    case 'toefl-repeat': {
      const short = sample(REPEAT.slice(0, 10), 3), mid = sample(REPEAT.slice(10, 20), 2), long = sample(REPEAT.slice(20), 2);
      return { items: [...short, ...mid, ...long] };
    }
    case 'toefl-build':
      return { items: sample(BUILD, 8) };
    case 'ielts-p1': {
      const t = pick(PART1);
      return { header: `Topic: ${t.topic}`, questions: t.qs };
    }
    case 'toefl-interview': {
      const t = pick(INTERVIEW);
      return { header: t.context, questions: t.qs };
    }
    case 'ielts-p2': {
      const c = pick(PART2);
      return { header: 'Cue card', questions: [c.title + '\nYou should say:\n• ' + c.b.join('\n• ')] };
    }
    case 'ielts-p3': {
      const t = pick(PART3);
      return { header: `Discussion: ${t.theme}`, questions: t.qs };
    }
    case 'ops-interview':
      return { header: 'Panel interview — Operations role (any industry)', questions: sample(STAR, 3) };
    case 'mock-speaking': {
      const p1 = pick(PART1), c = pick(PART2), p3 = pick(PART3);
      return {
        header: 'Full IELTS Speaking Mock',
        questions: [
          ...p1.qs.slice(0, 3).map((q) => `[Part 1 · ${p1.topic}] ${q}`),
          `[Part 2] ${c.title}\nYou should say:\n• ${c.b.join('\n• ')}`,
          ...p3.qs.slice(0, 3).map((q) => `[Part 3 · ${p3.theme}] ${q}`),
        ],
        limits: [40, 40, 40, 120, 60, 60, 60],
        prepAt: 3,
      };
    }
    case 'teach-explain':
      return { header: 'You are the teacher', questions: [pick(TEACH_EXPLAIN)] };
    case 'teach-class':
      return { header: 'You are the teacher', questions: sample(TEACH_CLASS, 2) };
    case 'teach-email': {
      const e = pick(TEACH_EMAIL);
      return { prompt: `${e.s}\n\nWrite an email to ${e.to}. In your email:\n• ${e.p.join('\n• ')}` };
    }
    case 'toefl-email': {
      const e = pick(EMAIL);
      return { prompt: `${e.s}\n\nWrite an email to ${e.to}. In your email:\n• ${e.p.join('\n• ')}` };
    }
    case 'ielts-gt1': {
      const l = pick(LETTERS);
      return { prompt: `${l.s}\n\nWrite a ${l.tone} letter. In your letter:\n• ${l.p.join('\n• ')}\n\nWrite at least 150 words. Begin your letter appropriately.` };
    }
    case 'toefl-discussion': {
      const d = pick(DISCUSSION);
      return { prompt: `Professor: ${d.prof}\n\n${d.a[0]}: ${d.a[1]}\n\n${d.b[0]}: ${d.b[1]}\n\nWrite a response that contributes to the discussion with your own opinion and reasons.` };
    }
    case 'ielts-task2':
    case 'mock-writing':
      return { prompt: `${pick(TASK2)}\n\nGive reasons for your answer and include relevant examples from your own knowledge or experience. Write at least 250 words.` };
    case 'ielts-ac1': {
      const a = pick(ACADEMIC_T1);
      return { prompt: `${a.title}\n\n${a.data}\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.` };
    }
    default:
      return { prompt: '' };
  }
}

// ---------- Daily Quest blocks per chapter (minutes, total 90) ----------
// Phase boundaries are proportional to each person's start → end dates (22%, 50%, 75%).
export const PHASE_SPLIT = [0, 0.22, 0.5, 0.75, 1];
export const CHAPTERS = [
  { n: 1, name: 'Fix the habits', start: '2026-11-17', end: '2026-12-14', focus: 'Learn the core rules, fix your top error patterns, and speak without long pauses.', blocks: { grammar: 15, debuff: 10, speaking: 25, writing: 20, listening: 10, phrases: 10 } },
  { n: 2, name: 'Expand your range', start: '2026-12-15', end: '2027-01-25', focus: 'Opinions, explanations, emails and complex sentences.', blocks: { grammar: 10, debuff: 10, speaking: 30, writing: 20, listening: 10, phrases: 10 } },
  { n: 3, name: 'Professional and exam performance', start: '2027-01-26', end: '2027-03-01', focus: 'Part 2/3, Task 2 essays and STAR interview answers.', blocks: { grammar: 5, debuff: 10, speaking: 30, writing: 30, listening: 10, phrases: 5 } },
  { n: 4, name: 'Full simulations', start: '2027-03-02', end: '2027-03-31', focus: 'Full mocks under exam conditions.', blocks: { grammar: 5, debuff: 5, speaking: 35, writing: 30, listening: 10, phrases: 5 } },
];

export const BLOCK_INFO = {
  grammar: { label: 'Grammar lesson', where: 'learn', note: 'Read one lesson, then pass its quick check (80%+).' },
  debuff: { label: 'Error drill', where: 'review', note: 'Short quiz on your most frequent error patterns.' },
  speaking: { label: 'Speaking practice', where: 'practice', note: 'Record an answer, read the feedback, then shadow the improved version.' },
  writing: { label: 'Writing practice', where: 'practice', note: 'Write, read the feedback, then rewrite one corrected sentence from memory.' },
  listening: { label: 'Listening and shadowing', where: 'timer', note: 'Listen to an English source, pause, and repeat sentences aloud.' },
  phrases: { label: 'Phrase review', where: 'review', note: 'Review due phrases and say each one in your own sentence.' },
};

export const LISTENING_SOURCES = [
  { name: 'BBC 6 Minute English', url: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english' },
  { name: 'British Council – IELTS Listening practice', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/listening' },
  { name: 'TED Talks (with transcript)', url: 'https://www.ted.com/talks' },
  { name: 'YouGlish (hear words in context)', url: 'https://youglish.com/' },
];

// ---------- Partner platforms (official / tested) ----------
export const SIDE_QUESTS = [
  { key: 'speak-improve', name: 'Speak and Improve (Cambridge)', url: 'https://speakandimprove.com/', every: 7, why: 'Pronunciation and a CEFR speaking estimate — the one thing this app cannot judge.' },
  { key: 'write-improve', name: 'Write and Improve (Cambridge)', url: 'https://writeandimprove.com/', every: 7, why: 'A second, independent writing score to cross-check the AI feedback here.' },
  { key: 'ielts-ready', name: 'IELTS Ready mock (British Council)', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare', every: 30, why: 'Official IELTS-format mock with estimated band.' },
  { key: 'human-talk', name: 'Talk with a human (HelloTalk / Tandem / friend)', url: 'https://www.hellotalk.com/', every: 7, why: 'Real conversation pressure. Start by Chapter 2.' },
  { key: 'efset-quick', name: 'EF SET 50-min check (optional)', url: 'https://www.efset.org/', every: 14, why: 'Mid-month reading/listening check.' },
];

// ---------- Checkpoints (real tests: the ONLY source of skill scores) ----------
export const RAIDS = [
  { date: '2026-12-17', name: 'Checkpoint 1' },
  { date: '2027-01-17', name: 'Checkpoint 2' },
  { date: '2027-02-17', name: 'Checkpoint 3' },
  { date: '2027-03-17', name: 'Checkpoint 4' },
  { date: '2027-03-31', name: 'Final assessment' },
];

export const TARGETS = { reading: 63, listening: 63, writing: 60, speaking: 58 };
export const END_DATE = '2027-03-31';

export const LEVELS = { E: 'Foundation', D: 'Core', C: 'Intermediate', B: 'Upper-intermediate', A: 'Advanced', S: 'Exam simulation' };

// Suggested tasks per focus and phase (rotate daily)
export const PLAN_TASKS = {
  'ielts-gt': {
    1: { speaking: ['toefl-repeat', 'ielts-p1', 'toefl-interview'], writing: ['toefl-build', 'toefl-email'] },
    2: { speaking: ['ielts-p1', 'toefl-interview', 'ielts-p2'], writing: ['toefl-email', 'ielts-gt1', 'toefl-discussion'] },
    3: { speaking: ['ielts-p2', 'ielts-p3', 'ops-interview'], writing: ['ielts-gt1', 'toefl-discussion', 'ielts-task2'] },
    4: { speaking: ['mock-speaking', 'ielts-p3', 'ops-interview'], writing: ['mock-writing', 'ielts-task2', 'ielts-gt1'] },
  },
  'ielts-ac': {
    1: { speaking: ['toefl-repeat', 'ielts-p1', 'toefl-interview'], writing: ['toefl-build', 'toefl-email'] },
    2: { speaking: ['ielts-p1', 'ielts-p2', 'toefl-interview'], writing: ['ielts-ac1', 'toefl-discussion', 'toefl-email'] },
    3: { speaking: ['ielts-p2', 'ielts-p3', 'ops-interview'], writing: ['ielts-ac1', 'ielts-task2', 'toefl-discussion'] },
    4: { speaking: ['mock-speaking', 'ielts-p3'], writing: ['mock-writing', 'ielts-ac1', 'ielts-task2'] },
  },
  toefl: {
    1: { speaking: ['toefl-repeat', 'toefl-interview'], writing: ['toefl-build', 'toefl-email'] },
    2: { speaking: ['toefl-interview', 'toefl-repeat', 'ielts-p1'], writing: ['toefl-email', 'toefl-discussion', 'toefl-build'] },
    3: { speaking: ['toefl-interview', 'ielts-p3', 'ops-interview'], writing: ['toefl-discussion', 'toefl-email', 'ielts-task2'] },
    4: { speaking: ['toefl-interview', 'mock-speaking'], writing: ['toefl-discussion', 'toefl-email', 'mock-writing'] },
  },
  'general-teaching': {
    1: { speaking: ['toefl-repeat', 'teach-explain', 'ielts-p1'], writing: ['toefl-build', 'teach-email', 'toefl-email'] },
    2: { speaking: ['teach-explain', 'teach-class', 'ielts-p1', 'toefl-interview'], writing: ['teach-email', 'toefl-email', 'ielts-gt1'] },
    3: { speaking: ['teach-class', 'ielts-p2', 'teach-explain', 'ielts-p3'], writing: ['teach-email', 'ielts-gt1', 'toefl-discussion'] },
    4: { speaking: ['ielts-p2', 'teach-class', 'ielts-p3'], writing: ['ielts-task2', 'teach-email', 'ielts-gt1'] },
  },
};

export const FOCUS = {
  'ielts-gt': 'IELTS General Training',
  'ielts-ac': 'IELTS Academic',
  toefl: 'TOEFL iBT',
  'general-teaching': 'General English and teaching (with IELTS/TOEFL practice)',
};

// Share of the daily target for each block, per phase (sums to 1). Teaching focus gets more grammar.
export const BLOCK_SHARE = {
  default: [
    { grammar: 0.17, debuff: 0.11, speaking: 0.28, writing: 0.22, listening: 0.11, phrases: 0.11 },
    { grammar: 0.11, debuff: 0.11, speaking: 0.33, writing: 0.23, listening: 0.11, phrases: 0.11 },
    { grammar: 0.06, debuff: 0.11, speaking: 0.33, writing: 0.33, listening: 0.11, phrases: 0.06 },
    { grammar: 0.06, debuff: 0.06, speaking: 0.39, writing: 0.33, listening: 0.10, phrases: 0.06 },
  ],
  'general-teaching': [
    { grammar: 0.30, debuff: 0.15, speaking: 0.20, writing: 0.15, listening: 0.10, phrases: 0.10 },
    { grammar: 0.25, debuff: 0.10, speaking: 0.25, writing: 0.20, listening: 0.10, phrases: 0.10 },
    { grammar: 0.15, debuff: 0.10, speaking: 0.30, writing: 0.25, listening: 0.10, phrases: 0.10 },
    { grammar: 0.10, debuff: 0.10, speaking: 0.35, writing: 0.25, listening: 0.10, phrases: 0.10 },
  ],
};

// Baseline used for "gap closed" (EF SET, 17 Nov 2026)
export const BASELINE = { reading: 63, listening: 67, writing: 50, speaking: 45 };
