// Data module containing default routines, skills database, and diet recommendations

export const DEFAULT_ROUTINE = [
  { id: 'sleep_1', start: '00:00', end: '05:30', name: 'Deep Sleep', type: 'sleep', desc: 'Restorative deep sleep for cell recovery and brain health.' },
  { id: 'wake_up', start: '05:30', end: '05:30', name: 'Wake Up Alarm', type: 'alarm', desc: 'Wake up, hydrate, and start the day.' },
  { id: 'morning_prep', start: '05:30', end: '06:15', name: 'Meditation, Brushing & Hydration', type: 'health', desc: 'Brush teeth, drink 500ml warm water, and perform 20 mins mindfulness meditation.' },
  { id: 'morning_walk', start: '06:15', end: '07:00', name: 'Morning Walk / Light Stretch', type: 'health', desc: 'Light cardio walk in nature and dynamic stretching to activate muscles.' },
  { id: 'trading_info', start: '07:00', end: '08:30', name: 'Trading Info & News', type: 'trading', desc: 'Analyze global indices, SGX/Gift Nifty, macro news, and plan trading levels.' },
  { id: 'pre_workout_meal', start: '08:30', end: '09:00', name: 'Pre-Workout Meal', type: 'diet', desc: 'Quick digesting carbs and hydration before hitting the gym.' },
  { id: 'gym', start: '09:00', end: '10:30', name: 'Gym & Exercise Workout', type: 'health', desc: 'Resistance training / Heavy lifting session targeting specific muscle groups.' },
  { id: 'post_gym_diet', start: '10:30', end: '11:30', name: 'Post-Gym Diet & Shower', type: 'diet', desc: 'High-protein meal / whey shake, refreshing warm shower, and recovery.' },
  { id: 'business_learning', start: '11:30', end: '13:00', name: 'Business Learning & Finance', type: 'learning', desc: 'Learn business models, microeconomics, financial statements, or startup marketing.' },
  { id: 'lunch', start: '13:00', end: '14:00', name: 'Healthy Lunch & Rest', type: 'diet', desc: 'High-fiber, high-protein balanced lunch followed by a short rest.' },
  { id: 'trading_charts', start: '14:00', end: '15:00', name: 'Trading Chart Analysis', type: 'trading', desc: 'Practice technical charting, support/resistance, price action patterns, and backtesting.' },
  { id: 'content_creation', start: '15:00', end: '16:30', name: 'Content Creation (Testing)', type: 'creative', desc: 'Record 2-4 test videos, practice editing, camera presence, and script pacing.' },
  { id: 'new_skill', start: '16:30', end: '17:30', name: 'New Skill Learning', type: 'new_skill', desc: 'Interactive skill learning session. Controlled dynamically by the automation engine.' },
  { id: 'english_learning', start: '17:30', end: '18:30', name: 'English Speaking & Practice', type: 'learning', desc: 'Practice conversational grammar, speak in front of a mirror, read aloud, or watch English videos.' },
  { id: 'friends_time', start: '18:30', end: '19:30', name: 'Park & Playing with Friends', type: 'social', desc: 'Meet friends in the park, play badminton/cricket, or walk. Social connection.' },
  { id: 'dinner', start: '19:30', end: '20:00', name: 'Healthy Dinner', type: 'diet', desc: 'Light dinner with complex carbs and protein to prevent sleep disruption.' },
  { id: 'entertainment', start: '20:00', end: '21:00', name: 'Entertainment & Recreation', type: 'leisure', desc: 'Watch a movie/show, play video games, listen to music, or relax.' },
  { id: 'reading', start: '21:00', end: '21:45', name: 'Psychology & Philosophy Reading', type: 'learning', desc: 'Read cognitive psychology, stoicism, Eastern philosophy, or human behavior studies.' },
  { id: 'wind_down', start: '21:45', end: '22:30', name: 'Night Wind-down & Logging', type: 'health', desc: 'Fill the daily review log, reflect, evening meditation (15m), and turn off screens.' },
  { id: 'sleep_alarm', start: '22:30', end: '22:30', name: 'Sleep Alarm', type: 'alarm', desc: 'Reminder to immediately go to sleep.' },
  { id: 'sleep_2', start: '22:30', end: '24:00', name: 'Deep Sleep', type: 'sleep', desc: 'Restorative deep sleep for body recovery and memory consolidation.' }
];

export const SCHOOL_ROUTINE = [
  { id: 'sleep_1', start: '00:00', end: '05:00', name: 'Deep Sleep', type: 'sleep', desc: 'Restorative deep sleep for cell recovery and brain health.' },
  { id: 'wake_up', start: '05:00', end: '05:00', name: 'Wake Up Alarm', type: 'alarm', desc: 'Wake up, hydrate, and start the day.' },
  { id: 'morning_prep', start: '05:00', end: '05:45', name: 'Meditation, Brushing & Hydration', type: 'health', desc: 'Brush teeth, drink 500ml warm water, and perform 20 mins mindfulness meditation.' },
  { id: 'breakfast', start: '05:45', end: '06:15', name: 'Quick Breakfast', type: 'diet', desc: 'Nutrient-rich early breakfast before heading to school.' },
  { id: 'commute_school', start: '06:15', end: '07:00', name: 'Travel to School', type: 'health', desc: 'Commuting to school, light stretching.' },
  { id: 'school_classes', start: '07:00', end: '12:00', name: 'School Classes', type: 'learning', desc: 'Active study, class lectures, and academic learning.' },
  { id: 'lunch_rest', start: '12:00', end: '13:00', name: 'Return & Healthy Lunch', type: 'diet', desc: 'Return home, consume a balanced high-protein lunch, and rest.' },
  { id: 'trading_info', start: '13:00', end: '14:00', name: 'Trading Info & News', type: 'trading', desc: 'Analyze morning market moves, news updates, and financial logs.' },
  { id: 'trading_charts', start: '14:00', end: '15:30', name: 'Trading Chart Analysis', type: 'trading', desc: 'Deep charting session, practicing price action patterns, and backtesting (1.5h).' },
  { id: 'gym', start: '15:30', end: '17:00', name: 'Gym & Exercise Workout', type: 'health', desc: 'Afternoon resistance training / heavy lifting workout (1.5h).' },
  { id: 'post_gym_diet', start: '17:00', end: '17:30', name: 'Post-Gym Diet & Shower', type: 'diet', desc: 'High-protein diet shake/meal, refreshing shower, and rest.' },
  { id: 'entertainment', start: '17:30', end: '18:15', name: 'Entertainment & Leisure', type: 'leisure', desc: 'Recreational slot for video games, movies, YouTube, or entertainment.' },
  { id: 'content_creation', start: '18:15', end: '19:00', name: 'Content Creation (Testing)', type: 'creative', desc: 'Practice recording video modules, editing cuts, and script writing.' },
  { id: 'friends_time', start: '19:00', end: '20:00', name: 'Park & Playing with Friends', type: 'social', desc: 'Meet friends in the park, run or walk. Evening relaxation.' },
  { id: 'dinner', start: '20:00', end: '20:45', name: 'Healthy Dinner & Rest', type: 'diet', desc: 'Consumes dinner with complex carbs and protein to prevent sleep disruption.' },
  { id: 'english_learning', start: '20:45', end: '21:30', name: 'English Speaking & Practice', type: 'learning', desc: 'Practice conversational grammar, speak in front of a mirror, read aloud.' },
  { id: 'new_skill', start: '21:30', end: '22:15', name: 'New Skill Learning', type: 'new_skill', desc: 'Self education study hour. Managed dynamically by the selector engine.' },
  { id: 'wind_down', start: '22:15', end: '22:30', name: 'Night Wind-down & Logging', type: 'health', desc: 'Fill the daily review log, evening meditation (15m), and turn off screens.' },
  { id: 'sleep_alarm', start: '22:30', end: '22:30', name: 'Sleep Alarm', type: 'alarm', desc: 'Reminder to immediately go to sleep.' },
  { id: 'sleep_2', start: '22:30', end: '24:00', name: 'Deep Sleep', type: 'sleep', desc: 'Restorative deep sleep for body recovery and memory consolidation.' }
];

export const SKILLS_DATABASE = [
  {
    id: 'prompt_engineering',
    name: 'Prompt Engineering & LLM Usage',
    category: 'Technology',
    difficulty: 'Beginner',
    estimatedTime: '20 Hours',
    description: 'Learn to direct AI models effectively using advanced prompting techniques (Few-shot, Chain-of-Thought, ReAct, Role-playing).',
    topics: [
      'Understanding LLM tokens and temperature',
      'Zero-shot, Few-shot prompting, and instruction following',
      'Chain-of-thought prompting for logical reasoning',
      'System prompt design and context framing',
      'Preventing hallucinations and prompt injection'
    ]
  },
  {
    id: 'video_editing_premiere',
    name: 'Video Editing (Premiere Pro & CapCut)',
    category: 'Creative',
    difficulty: 'Intermediate',
    estimatedTime: '35 Hours',
    description: 'Learn video cutting, color grading, sound design, and text transitions for engaging content creation.',
    topics: [
      'Timeline management and ripple cuts',
      'Visual storytelling, pacing, and B-rolls',
      'Color correction and color grading (LUTs)',
      'Audio leveling, sound effects, and background music integration',
      'Keyframing text, zoom effects, and trendy transitions'
    ]
  },
  {
    id: 'copywriting',
    name: 'Copywriting & Persuasive Writing',
    category: 'Business',
    difficulty: 'Beginner',
    estimatedTime: '25 Hours',
    description: 'Master the art of writing headlines, scripts, and descriptions that grab attention and drive conversions.',
    topics: [
      'Understanding human psychology and desires (AIDA framework)',
      'Writing compelling hooks and headlines',
      'Structuring short-form video scripts (first 3 seconds rule)',
      'Call to action (CTA) design',
      'Editing copy for brevity, punchiness, and readability'
    ]
  },
  {
    id: 'ui_ux_figma',
    name: 'UI/UX Design with Figma',
    category: 'Creative',
    difficulty: 'Intermediate',
    estimatedTime: '40 Hours',
    description: 'Learn to design beautiful, user-friendly layouts, wireframes, and high-fidelity interactive prototypes.',
    topics: [
      'Principles of typography, spacing, and grid layouts',
      'Designing wireframes and user flows',
      'Figma auto-layout, components, and design systems',
      'Color theory, gradients, and dark/light UI design',
      'Creating interactive prototypes with micro-interactions'
    ]
  },
  {
    id: 'seo_analytics',
    name: 'SEO & Content Analytics',
    category: 'Business',
    difficulty: 'Intermediate',
    estimatedTime: '30 Hours',
    description: 'Understand how search engines rank content, research high-traffic keywords, and read traffic metrics.',
    topics: [
      'On-page SEO (headings, meta descriptions, alt tags)',
      'Keyword research using free and paid tools',
      'YouTube/Google algorithm mechanics',
      'Analyzing audience retention graphs and CTR (Click-Through Rate)',
      'Competitor analysis and content gap finding'
    ]
  },
  {
    id: 'web_dev_basics',
    name: 'Frontend Development (HTML, CSS, JS)',
    category: 'Technology',
    difficulty: 'Beginner',
    estimatedTime: '50 Hours',
    description: 'Learn the foundational languages of the web to build personal websites, landing pages, and interactive dashboards.',
    topics: [
      'Semantic HTML5 markup structure',
      'CSS3 layouts (Flexbox, CSS Grid, Media queries for responsive design)',
      'CSS animations and glassmorphic designs',
      'Javascript variables, loops, arrays, and functions',
      'DOM Manipulation and responding to user events'
    ]
  },
  {
    id: 'financial_accounting',
    name: 'Financial Statement Analysis',
    category: 'Business',
    difficulty: 'Advanced',
    estimatedTime: '30 Hours',
    description: 'Learn to read balance sheets, income statements, and cash flow statements to evaluate company performance.',
    topics: [
      'Structure of Income statement, Balance sheet, and Cash flow statement',
      'Key financial ratios (P/E, Debt-to-Equity, ROE, Profit margins)',
      'Assessing company solvency, liquidity, and operational efficiency',
      'Spotting accounting red flags and earnings manipulation',
      'Valuation techniques (DCF, Multiples comparison)'
    ]
  },
  {
    id: 'python_basics',
    name: 'Python Programming & Automation',
    category: 'Technology',
    difficulty: 'Beginner',
    estimatedTime: '45 Hours',
    description: 'Learn basic python scripting to automate repetitive tasks, scrape web pages, and analyze data tables.',
    topics: [
      'Python syntax, variables, lists, dicts, and control flow',
      'Writing and importing modules',
      'File operations (reading/writing CSVs, JSON, text files)',
      'Web scraping with BeautifulSoup',
      'Writing simple bots for automation'
    ]
  }
];

export const DIET_PLANS = {
  preWorkout: {
    title: 'Pre-Workout Energizer (08:30 AM - 09:00 AM)',
    desc: 'जिम में भारी लिफ्टिंग के लिए जल्दी पचने वाले कार्बोहाइड्रेट और हाइड्रेशन।',
    meals: [
      {
        name: 'Oats & Banana Bowl (Veg)',
        nutrition: 'Calories: 280 kcal | Protein: 8g | Carbs: 55g | Fats: 4g',
        ingredients: '1 cup rolled oats cooked in water, 1 sliced medium banana, 1 tsp honey, pinch of cinnamon.',
        tips: 'Workout से 30 मिनट पहले लें। साथ में 1 कप ब्लैक कॉफी (बिना चीनी) पी सकते हैं जो फोकस बढ़ाएगी।'
      },
      {
        name: 'Peanut Butter Toast (Veg)',
        nutrition: 'Calories: 260 kcal | Protein: 10g | Carbs: 32g | Fats: 11g',
        ingredients: '2 slices of whole wheat bread, 1.5 tbsp unsweetened peanut butter, half sliced banana.',
        tips: 'शरीर को पर्याप्त हाइड्रेट रखें, इस मील के साथ कम से कम 300ml पानी पिएं।'
      },
      {
        name: 'Banana & Milk Shake (Budget Options)',
        nutrition: 'Calories: 320 kcal | Protein: 12g | Carbs: 52g | Fats: 7g',
        ingredients: '2 medium ripe bananas, 250ml low-fat milk (or soy milk), 1 tsp honey, blended together.',
        tips: 'कसरत से 30 मिनट पहले पिएं। यह प्रोटीन, पोटैशियम और कार्बोहाइड्रेट का सबसे सस्ता और बेहतरीन स्रोत है।'
      }
    ]
  },
  postWorkout: {
    title: 'Post-Workout Muscle Recovery (10:30 AM - 11:30 AM)',
    desc: 'जिम सेशन के तुरंत बाद मांसपेशियों की मरम्मत और रिकवरी के लिए उच्च प्रोटीन और मध्यम कार्ब्स आहार।',
    meals: [
      {
        name: 'Whey Protein Shake & Eggs (Non-Veg Option)',
        nutrition: 'Calories: 410 kcal | Protein: 42g | Carbs: 22g | Fats: 12g',
        ingredients: '1 scoop Whey Protein in water, 3 boiled egg whites, 1 whole egg, 1 medium apple.',
        tips: 'जिम के बाद 30-45 मिनट के भीतर प्रोटीन शेक पिएं। अंडे शावर लेने के बाद खा सकते हैं।'
      },
      {
        name: 'Paneer / Tofu Protein Scramble & Toast (Veg Option)',
        nutrition: 'Calories: 450 kcal | Protein: 30g | Carbs: 38g | Fats: 18g',
        ingredients: '150g Low-fat Paneer or Tofu scrambled with spinach and tomatoes, 2 slices of toasted multigrain bread.',
        tips: 'हल्दी और काली मिर्च मिलाकर पकाएं, यह वर्कआउट के बाद मांसपेशियों की सूजन (inflammation) को कम करता है।'
      },
      {
        name: 'Boiled Eggs & Bread + Milk (Budget Non-Veg / Ovo-Veg)',
        nutrition: 'Calories: 395 kcal | Protein: 28g | Carbs: 32g | Fats: 13g',
        ingredients: '3 boiled egg whites, 2 whole boiled eggs, 2 slices of toasted brown bread, 1 glass (200ml) milk.',
        tips: 'यह सबसे सस्ता और उच्च गुणवत्ता वाला प्रोटीन मील है। अंडे का सफेद भाग शुद्ध प्रोटीन देता है और पीला भाग स्वस्थ वसा (healthy fats)।'
      },
      {
        name: 'Sattu Protein Drink & Roasted Chana (Budget Veg)',
        nutrition: 'Calories: 380 kcal | Protein: 22g | Carbs: 58g | Fats: 6g',
        ingredients: '4 tbsp Sattu powder mixed in 300ml cold water, lemon juice, black salt, cumin. Served with 50g roasted peanuts/chana.',
        tips: 'यह एक बेहतरीन प्राकृतिक और सस्ता प्रोटीन ड्रिंक है। पेट के लिए बहुत ठंडा और पाचक है।'
      }
    ]
  },
  lunch: {
    title: 'High-Fiber Balanced Lunch (01:00 PM - 02:00 PM)',
    desc: 'दिन भर की एनर्जी बनाए रखने और पाचन क्रिया को दुरुस्त रखने के लिए संपूर्ण आहार।',
    meals: [
      {
        name: 'Dal, Rice, Tofu & Salad Bowl',
        nutrition: 'Calories: 520 kcal | Protein: 28g | Carbs: 72g | Fats: 10g',
        ingredients: '1 bowl Moong/Arhar Dal, 1 cup brown/white Rice, 100g pan-seared Tofu or Paneer, 1 plate green cucumber-tomato salad.',
        tips: 'खाने के तुरंत बाद ज्यादा पानी न पिएं। 30-40 मिनट बाद गुनगुना पानी पी सकते हैं।'
      },
      {
        name: 'Soya Chunk Pulav & Curd',
        nutrition: 'Calories: 490 kcal | Protein: 32g | Carbs: 65g | Fats: 9g',
        ingredients: '50g soya chunks cooked with basmati rice, peas, and carrots. Served with 150g fresh low-fat curd.',
        tips: 'सोया चंक्स प्रोटीन का एक बेहतरीन और सस्ता स्रोत हैं। यह शाकाहारियों के लिए सर्वोत्तम है।'
      },
      {
        name: 'Rice, Dal & Eggs/Paneer Scramble (Budget Option)',
        nutrition: 'Calories: 510 kcal | Protein: 26g | Carbs: 68g | Fats: 12g',
        ingredients: '1 bowl Arhar/Moong Dal, 1 plate white/brown rice, 3 boiled egg whites (scrambled with onion/tomato) or 70g paneer, cucumber salad.',
        tips: 'घर का बना सादा, पौष्टिक और बहुत ही किफ़ायती भोजन।'
      }
    ]
  },
  dinner: {
    title: 'Light & Nutrient-Dense Dinner (07:30 PM - 08:30 PM)',
    desc: 'गहरी नींद को बढ़ावा देने और रात में रिकवरी करने के लिए हल्का डिनर।',
    meals: [
      {
        name: 'Grilled Chicken/Fish & Veggies (Non-Veg)',
        nutrition: 'Calories: 360 kcal | Protein: 35g | Carbs: 15g | Fats: 14g',
        ingredients: '150g grilled chicken breast or fish, sautéed broccoli, carrots, bell peppers in olive oil.',
        tips: 'हल्का खाना खाने से रात को पेट साफ रहता है और नींद के दौरान ग्रोथ हॉर्मोन ठीक से रिलीज़ होते हैं।'
      },
      {
        name: 'Mixed Veg Soup & Paneer Tikka (Veg)',
        nutrition: 'Calories: 340 kcal | Protein: 24g | Carbs: 20g | Fats: 16g',
        ingredients: '1 bowl thick vegetable soup (carrot, tomato, spinach), 120g grilled low-fat paneer cubes marinated with curd and spices.',
        tips: 'डिनर सोने से कम से कम 2 घंटे पहले पूरा कर लें।'
      },
      {
        name: 'Oats, Milk & Banana Porridge (Budget Option)',
        nutrition: 'Calories: 350 kcal | Protein: 14g | Carbs: 60g | Fats: 6g',
        ingredients: '1 cup rolled oats cooked in 250ml milk, 1 sliced medium banana, 5-6 raw almonds/raisins.',
        tips: 'दूध और केले में ट्रिप्टोफैन (tryptophan) होता है जो मेलाटोनिन बढ़ाता है, जिससे रात में गहरी और शांतिपूर्ण नींद आती है।'
      }
    ]
  }
};
