require('dotenv').config();
const fetch = require('node-fetch');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = 'Businesses';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ========== BRAND TEMPLATES ==========
const BRANDS = {
  // --- TUTORING ---
  'Kumon': {
    match: (name) => name.toLowerCase().includes('kumon'),
    take: 'Best for kids who need structured daily practice in math and reading. Not ideal for drop-in homework help or test prep.',
    price_note: '~$155-160/mo per subject · Monthly membership',
    what_to_expect: 'Your first visit includes a free placement assessment (about 30 minutes) to determine your child\'s starting level. Sessions are 30 minutes, twice a week at the center. Students also complete daily worksheets at home (about 20 minutes). Expect a parent orientation in the first week. Progress reports are shared every 3 months, and the instructor adjusts the curriculum based on your child\'s pace.',
    good_fit: 'Your child needs to strengthen math or reading fundamentals\nYour child can work independently with minimal hand-holding\nYou can commit to 20 minutes of daily home worksheets\nYou want a structured, long-term program (not quick test prep)\nYour child responds well to routine and repetition',
    how_it_compares: 'Unlike Mathnasium (instructor-led, conceptual approach), Kumon uses self-paced worksheets that students complete independently. Unlike private tutors, Kumon follows a fixed, incremental curriculum \u2014 your child progresses through levels, not school assignments. It\'s typically cheaper than both alternatives but requires a daily home practice commitment. Most families see measurable grade-level improvement within 3-6 months. Average enrollment is 2+ years.'
  },
  'Mathnasium': {
    match: (name) => name.toLowerCase().includes('mathnasium'),
    take: 'Best for kids who need conceptual math understanding with instructor guidance. Not ideal for reading help or self-directed learners.',
    price_note: '~$200-300/mo · Monthly membership · Unlimited visits',
    what_to_expect: 'Your first visit includes a free math assessment to identify gaps in understanding. Sessions are instructor-led, typically 1 hour, and students can attend as often as they like (most come 2-3x/week). The Mathnasium Method focuses on building number sense and understanding "why," not just "how." Expect a customized learning plan and regular progress updates.',
    good_fit: 'Your child struggles with math concepts, not just procedures\nYour child benefits from one-on-one instructor attention\nYou want flexible scheduling (drop in as often as needed)\nYou prefer conceptual understanding over rote practice\nYour child needs help with school math or wants to get ahead',
    how_it_compares: 'Unlike Kumon (self-paced worksheets, daily home practice), Mathnasium is instructor-led with no required homework. Unlike private tutors, Mathnasium uses a proprietary curriculum that fills gaps systematically. More expensive than Kumon but includes unlimited visits. Most families see improvement within 2-3 months. Math-only \u2014 no reading program.'
  },
  'Best Brains': {
    match: (name) => name.toLowerCase().includes('best brains'),
    take: 'Best for kids who want a well-rounded program covering math, English, abacus, and coding. Not ideal for deep single-subject focus.',
    price_note: '~$140-180/mo · Weekly classes',
    what_to_expect: 'Students attend one 2-hour class per week covering math, English, abacus, and general knowledge. The curriculum is structured by grade level with regular assessments. Homework is assigned weekly. Classes are small groups (6-8 students). Expect a diagnostic test on your first visit to determine placement.',
    good_fit: 'You want a multi-subject enrichment program in one place\nYour child is in elementary or middle school\nYou prefer once-a-week commitment over daily practice\nYou want math AND English covered together\nYour child does well in small group settings',
    how_it_compares: 'Unlike Kumon (daily worksheets, 2 subjects), Best Brains covers 4+ subjects in one weekly session. Unlike Mathnasium (math-only, drop-in), Best Brains has a fixed weekly schedule. More affordable than most alternatives but less intensive. Good for general enrichment rather than catching up on a specific subject.'
  },
  'C2 Education': {
    match: (name) => name.toLowerCase().includes('c2 education'),
    take: 'Best for high schoolers preparing for SAT/ACT or college admissions. Not ideal for young children or basic skill building.',
    price_note: '~$250-400/mo · Varies by program',
    what_to_expect: 'Starts with a diagnostic assessment to identify strengths and weaknesses. Programs include SAT/ACT prep, subject tutoring, and college counseling. Sessions are typically 1-on-1 or small group, 1-2x per week. Expect a personalized study plan and practice tests. College admissions counseling includes essay review and application strategy.',
    good_fit: 'Your child is in high school preparing for SAT or ACT\nYou want combined test prep and college admissions guidance\nYou prefer personalized 1-on-1 instruction\nYour teen needs help with specific AP or honors subjects\nYou value a structured, goal-oriented program',
    how_it_compares: 'Unlike Kumon or Mathnasium (K-12 fundamentals), C2 focuses on high school test prep and college readiness. More expensive but includes college counseling that standalone tutors don\'t offer. Unlike self-study (Khan Academy, prep books), C2 provides accountability and personalized pacing. Most students complete a 3-6 month program before their target test date.'
  },
  'Eye Level': {
    match: (name) => name.toLowerCase().includes('eye level'),
    take: 'Best for kids who need a structured, self-paced program in math and English. Similar to Kumon but with more instructor interaction.',
    price_note: '~$140-200/mo per subject · Monthly enrollment',
    what_to_expect: 'Starts with a diagnostic test to determine your child\'s level. Sessions are 2x per week at the center, about 45 minutes each. Students work through booklets at their own pace with instructor check-ins. Homework is assigned between sessions. Progress is tracked through regular level assessments.',
    good_fit: 'Your child needs to build fundamentals in math or English\nYou want more instructor interaction than pure self-study\nYour child is in elementary or middle school\nYou can commit to twice-weekly center visits\nYou want a structured program with clear level progression',
    how_it_compares: 'Similar to Kumon in structure (worksheet-based, incremental levels) but with more instructor guidance during sessions. Typically similar price range. Unlike Mathnasium (conceptual, unlimited visits), Eye Level follows a fixed curriculum with set visit frequency. Less homework burden than Kumon but still requires home practice.'
  },
  'Gideon': {
    match: (name) => name.toLowerCase().includes('gideon'),
    take: 'Best for kids who need targeted help in math or reading with small group instruction. Affordable alternative to big-name franchises.',
    price_note: '~$120-160/mo · Weekly sessions',
    what_to_expect: 'Students attend weekly small-group sessions (4-6 kids) focused on math or reading. Starts with a placement assessment. The curriculum uses a mastery-based approach \u2014 students must demonstrate understanding before advancing. Homework is assigned between sessions. Progress reports provided monthly.',
    good_fit: 'Your child needs focused help in math or reading\nYou prefer small group learning over solo worksheets\nYou want an affordable tutoring option\nYour child is in elementary or middle school\nYou want steady, incremental progress',
    how_it_compares: 'More affordable than Kumon or Mathnasium. Small group format means more social interaction than Kumon\'s self-paced model. Less intensive (once weekly vs. 2-3x) but also less time commitment. Good middle ground between franchise programs and private tutoring.'
  },
  'Reading Ranch': {
    match: (name) => name.toLowerCase().includes('reading ranch'),
    take: 'Best for kids who need focused reading and phonics help. Not a math program \u2014 purely reading and writing.',
    price_note: '~$150-200/mo · Weekly sessions',
    what_to_expect: 'Students attend weekly small-group sessions focused on phonics, reading fluency, and comprehension. Starts with a reading assessment to determine level. Uses a structured curriculum that builds from letter sounds to full reading. Sessions are about 1 hour. Home reading practice is encouraged between sessions.',
    good_fit: 'Your child is learning to read or struggling with reading\nYou want a program focused exclusively on literacy\nYour child is in pre-K through elementary school\nYou prefer small group instruction\nYour child needs phonics-based reading support',
    how_it_compares: 'Unlike Kumon (math + reading, worksheet-based), Reading Ranch focuses purely on reading with a phonics-first approach. Unlike tutors who may cover school assignments, Reading Ranch builds foundational reading skills systematically. More specialized but narrower scope than multi-subject programs.'
  },
  'JEI': {
    match: (name) => name.toLowerCase().includes('jei learning'),
    take: 'Best for kids who need self-paced math and English practice with diagnostic-based placement. Korean-founded alternative to Kumon.',
    price_note: '~$140-180/mo per subject',
    what_to_expect: 'Begins with a JEI diagnostic assessment to pinpoint skill gaps. Students attend 2x per week, working through JEI workbooks at their own pace. Instructors monitor progress and provide guidance. Math and English programs are separate. Expect regular progress reports and level-up assessments.',
    good_fit: 'Your child needs to strengthen math or English fundamentals\nYou want a self-paced, workbook-based program\nYour child is in elementary or middle school\nYou prefer a structured, level-based curriculum\nYou want an alternative to Kumon with a similar approach',
    how_it_compares: 'Very similar to Kumon in structure and price. JEI\'s diagnostic placement is often considered more precise. Less name recognition but same general approach: incremental, self-paced, workbook-based. Some parents prefer JEI\'s slightly smaller class sizes and more personalized attention.'
  },
  'The Tutoring Center': {
    match: (name) => name.toLowerCase().startsWith('the tutoring center'),
    take: 'Best for kids who need 1-on-1 attention in a specific subject. Flexible programs for reading, math, writing, or test prep.',
    price_note: '~$200-350/mo · Varies by program length',
    what_to_expect: 'Starts with a free diagnostic assessment. Programs are customized to each student with 1-on-1 instruction, not group classes. Sessions are typically 1 hour, 2-3x per week. The curriculum targets specific skill gaps identified in the assessment. Programs usually run 3-6 months with clear goals.',
    good_fit: 'Your child needs personalized 1-on-1 attention\nYou want a customized program, not a one-size-fits-all curriculum\nYour child has specific skill gaps in reading, math, or writing\nYou prefer a structured program with a defined timeline\nYour child doesn\'t do well in group settings',
    how_it_compares: 'Unlike Kumon or Mathnasium (group/self-paced), The Tutoring Center offers true 1-on-1 instruction. More expensive but more personalized. Unlike private tutors, they use a structured assessment-based approach. Programs have a defined endpoint rather than ongoing monthly enrollment.'
  },
  'Test Geek': {
    match: (name) => name.toLowerCase().includes('test geek'),
    take: 'Best for high schoolers preparing for SAT or ACT. Not a general tutoring center \u2014 focused exclusively on test prep.',
    price_note: '~$800-1,500 per course · Group or private options',
    what_to_expect: 'Courses run 6-8 weeks with weekly sessions. Includes practice tests, strategy instruction, and targeted content review. Students take a diagnostic test first to identify weak areas. Group classes are small (6-10 students). Private tutoring is also available at higher cost. Expect homework between sessions.',
    good_fit: 'Your teen is preparing for the SAT or ACT\nYou want focused test prep, not general subject tutoring\nYour teen has a target test date in the next 2-3 months\nYou prefer a structured course over self-study\nYour teen is motivated to improve their score',
    how_it_compares: 'Unlike C2 Education (test prep + college counseling), Test Geek focuses purely on score improvement. More affordable than private prep tutors. Unlike self-study apps (Khan Academy), provides structure and accountability. Course-based pricing rather than monthly \u2014 you pay for a defined program, not ongoing enrollment.'
  },

  // --- DAYCARES & PRESCHOOLS ---
  'Primrose': {
    match: (name) => name.toLowerCase().includes('primrose school'),
    take: 'Best for families wanting a structured, curriculum-based preschool with consistent routines. Premium option with a national reputation.',
    price_note: '~$1,200-1,800/mo · Full-time enrollment',
    what_to_expect: 'Primrose uses its proprietary Balanced Learning curriculum covering literacy, math, science, and social skills. Full-day programs run 7am-6pm. Classrooms are organized by age group with certified teachers. Expect daily activity reports, structured outdoor play, and meals/snacks included. Parent engagement events are held regularly.',
    good_fit: 'You want a nationally accredited, curriculum-driven preschool\nYour child is 6 weeks to 5 years old\nYou value consistency and structured daily routines\nYou want meals and snacks included\nYou prefer a school-like environment over a home daycare',
    how_it_compares: 'More structured and curriculum-focused than home daycares or small centers. Premium pricing but includes meals, enrichment, and certified teachers. Similar to Goddard School and Creme de la Creme in approach. Unlike Montessori programs, Primrose follows a teacher-directed curriculum rather than child-led exploration.'
  },
  'Montessori': {
    match: (name) => name.toLowerCase().includes('montessori') && !name.toLowerCase().includes('kumon'),
    take: 'Best for families who want child-led, hands-on learning. Children choose their own activities within a prepared environment.',
    price_note: '~$1,000-1,600/mo · Varies by age and schedule',
    what_to_expect: 'Montessori classrooms use mixed-age groups and hands-on learning materials. Children choose their activities and work at their own pace. Teachers act as guides, not lecturers. Expect a focus on independence, practical life skills, and self-directed exploration. Most programs offer half-day and full-day options.',
    good_fit: 'Your child is curious and self-motivated\nYou value independence and hands-on learning over structured instruction\nYour child is between 18 months and 6 years old\nYou want mixed-age classrooms where older kids mentor younger ones\nYou prefer a child-led approach over teacher-directed lessons',
    how_it_compares: 'Unlike Primrose or traditional preschools (teacher-directed), Montessori is child-led with self-chosen activities. Unlike play-based daycares, Montessori uses specific learning materials designed by Maria Montessori. More freedom but also more structure than it appears \u2014 the classroom environment is carefully designed. Pricing is comparable to premium preschools.'
  },
  'KinderCare': {
    match: (name) => name.toLowerCase().includes('kindercare'),
    take: 'Best for working families who need reliable full-day care with an educational component. Flexible schedules and extended hours.',
    price_note: '~$1,100-1,500/mo · Full-time',
    what_to_expect: 'Full-day programs from 6:30am-6:30pm with age-appropriate classrooms. Uses a research-backed curriculum covering early literacy, math, science, and social skills. Meals and snacks are included. Daily reports on activities, meals, and milestones. Flexible drop-off and pick-up times within operating hours.',
    good_fit: 'You need full-day care with early drop-off or late pick-up\nYour child is 6 weeks to 12 years old\nYou want a nationally recognized childcare provider\nYou need flexibility in scheduling\nYou want an educational component built into daycare',
    how_it_compares: 'Largest childcare provider in the US \u2014 consistent quality across locations. More affordable than Primrose or Creme de la Creme. Less academic than Montessori but more structured than home daycares. Extended hours make it practical for working parents with long commutes.'
  },
  'Learning Experience': {
    match: (name) => name.toLowerCase().includes('learning experience'),
    take: 'Best for families wanting a tech-forward preschool with a proprietary STEM curriculum. Modern facilities with interactive learning.',
    price_note: '~$1,100-1,600/mo · Full-time enrollment',
    what_to_expect: 'Uses the proprietary L.E.A.P. curriculum integrating STEM, literacy, and social development. Classrooms feature interactive technology and hands-on learning stations. Full-day programs with meals included. Daily progress reports via a parent app. Enrichment activities include music, fitness, and language exposure.',
    good_fit: 'You want a modern, tech-integrated learning environment\nYour child is 6 weeks to 6 years old\nYou value STEM exposure from an early age\nYou want real-time updates via a parent app\nYou prefer a structured curriculum over free play',
    how_it_compares: 'More tech-forward than traditional preschools like Primrose. Similar pricing to other premium chains. The parent app provides more daily visibility than most competitors. Less child-directed than Montessori but more innovative than traditional daycare centers.'
  },
  'Bright Horizons': {
    match: (name) => name.toLowerCase().includes('bright horizons'),
    take: 'Best for corporate-affiliated families. Premium childcare often subsidized by employers. High standards with backup care options.',
    price_note: '~$1,300-2,000/mo · Check employer benefits',
    what_to_expect: 'Full-day programs with a play-based, exploratory curriculum. Many locations are employer-sponsored, offering discounted rates. Classrooms are organized by age with low teacher-to-child ratios. Meals included. Also offers backup care for days when your regular arrangement falls through.',
    good_fit: 'Your employer partners with Bright Horizons (check your benefits)\nYou want premium care with nationally accredited standards\nYou need backup care options for emergencies\nYour child is 6 weeks to 5 years old\nYou value low teacher-to-child ratios',
    how_it_compares: 'Premium pricing but often subsidized by employers \u2014 check your benefits first. Higher staff ratios than most competitors. The backup care benefit is unique and very valuable for working parents. More expensive out-of-pocket than KinderCare but comparable to Primrose.'
  },

  // --- KIDS ACTIVITIES ---
  'Aqua-Tots': {
    match: (name) => name.toLowerCase().includes('aqua-tots'),
    take: 'Best for introducing babies and young children to water safety. Year-round heated indoor pools with small class sizes.',
    price_note: '~$80-120/mo · Weekly 30-min lessons',
    what_to_expect: 'Lessons are 30 minutes, once per week in a heated indoor pool (90\u00b0F). Classes are grouped by age and skill level, starting as young as 4 months. Expect 4-6 kids per class with a certified instructor in the water. Parents participate in baby/toddler classes. Skills progress from water comfort to stroke development.',
    good_fit: 'Your child is 4 months to 12 years old\nYou want year-round swim lessons in a warm indoor pool\nYou prioritize water safety as a life skill\nYou prefer small class sizes with in-water instructors\nYour baby or toddler needs early water exposure',
    how_it_compares: 'Unlike Emler or SafeSplash (similar franchise swim schools), Aqua-Tots is known for very warm water temperatures ideal for babies. Unlike rec center lessons (larger classes, outdoor pools), Aqua-Tots offers consistent indoor conditions year-round. More expensive than community swim programs but more personalized.'
  },
  'Emler': {
    match: (name) => name.toLowerCase().includes('emler swim'),
    take: 'Best for kids learning to swim with a structured, skill-based progression. Indoor heated pools with small instructor-to-student ratios.',
    price_note: '~$85-130/mo · Weekly 30-min lessons',
    what_to_expect: 'Lessons are 30 minutes, once per week. Classes are small (3-4 students per instructor). Uses a proprietary skill-level system \u2014 kids advance by demonstrating specific abilities. Indoor heated pool. Parents watch from an observation area. Expect regular skill assessments and level promotions.',
    good_fit: 'Your child is 2 months to 12 years old\nYou want a clear skill progression system\nYou prefer very small class sizes (3-4 kids)\nYou want year-round indoor lessons\nYour child is working toward specific swim milestones',
    how_it_compares: 'Smaller class sizes than Aqua-Tots or SafeSplash (3-4 vs 4-6). Slightly more expensive but more individual attention. Clear level system makes progress visible. Unlike YMCA or rec center lessons, Emler is swim-only with dedicated facilities.'
  },
  'SafeSplash': {
    match: (name) => name.toLowerCase().includes('safesplash'),
    take: 'Best for families wanting affordable swim lessons with flexible scheduling. Multiple skill levels from infant to competitive prep.',
    price_note: '~$70-110/mo · Weekly lessons',
    what_to_expect: 'Lessons are 30 minutes, once or twice per week. Classes grouped by age and ability. Indoor heated pools with certified instructors. Skill-based progression from water introduction to stroke refinement. Parent observation areas available. Makeup lessons offered for missed classes.',
    good_fit: 'Your child is 6 months to adult\nYou want affordable swim lessons without a long commitment\nYou need flexible scheduling with makeup options\nYour child is anywhere from beginner to intermediate\nYou want a nationally recognized swim program',
    how_it_compares: 'More affordable than Aqua-Tots or Emler. Slightly larger class sizes but offers makeup lessons that others don\'t. Good value option for families who want quality instruction without premium pricing. Less boutique than Emler but more structured than rec center programs.'
  },
  'Premier Martial Arts': {
    match: (name) => name.toLowerCase().includes('premier martial arts'),
    take: 'Best for kids who want to build discipline and confidence through martial arts. Structured belt system with character development focus.',
    price_note: '~$120-200/mo · 2-3 classes per week',
    what_to_expect: 'Classes are 45-60 minutes, typically 2-3x per week. Students progress through a colored belt ranking system. Curriculum combines martial arts technique with character lessons (respect, focus, discipline). Expect a free trial class. Most kids start seeing belt promotions within 2-3 months.',
    good_fit: 'Your child needs to build confidence and self-discipline\nYour child is 4-14 years old\nYou want a structured activity with clear goals (belt ranks)\nYour child has energy to burn in a constructive way\nYou value character development alongside physical activity',
    how_it_compares: 'Unlike independent dojos (varied quality), Premier Martial Arts follows a standardized franchise curriculum. More structured than recreational karate classes at community centers. Similar pricing to other martial arts franchises. Focus is on character development as much as technique.'
  },
  'School of Rock': {
    match: (name) => name.toLowerCase().includes('school of rock'),
    take: 'Best for kids who want to learn instruments by playing real songs in a band setting. Performance-based music education.',
    price_note: '~$200-350/mo · Weekly lessons + band rehearsal',
    what_to_expect: 'Students get weekly private lessons on their instrument plus weekly group band rehearsals. They learn by playing real songs (not just scales). Bands perform at live concerts every few months. Instruments include guitar, bass, drums, keyboards, and vocals. Gear is provided during lessons.',
    good_fit: 'Your child wants to play in a real band, not just take solo lessons\nYour child is 7-18 years old\nYou want performance opportunities\nYour child is motivated by playing songs they actually like\nYou value social music-making over classical technique',
    how_it_compares: 'Unlike traditional music lessons (1-on-1, classical repertoire), School of Rock is band-based and plays popular music. More expensive than private lessons but includes both individual and group instruction. The performance aspect is unique \u2014 most music schools don\'t offer regular live shows. Less focused on theory and reading music than classical programs.'
  },

  // --- BIRTHDAY PARTY VENUES ---
  'Main Event': {
    match: (name) => name.toLowerCase().includes('main event'),
    take: 'Best for older kids who want bowling, laser tag, and arcade games. All-in-one entertainment center with party packages.',
    price_note: '~$25-40 per child · Party packages',
    what_to_expect: 'Party packages include 2 hours of activities (bowling, laser tag, arcade, or VR), a private party room, and food/drinks. Typically accommodates 8-20+ kids. A dedicated party host handles setup and coordination. Expect to book 2-3 weeks in advance for weekends. Parents can customize the activity mix.',
    good_fit: 'Your child is 6-16 years old\nYou want an action-packed party with multiple activities\nYou prefer an all-inclusive package (activities + food + room)\nYou don\'t want to handle setup or cleanup\nYour group is 8-20+ kids',
    how_it_compares: 'More activity variety than single-concept venues (just trampolines or just bowling). Similar pricing to Urban Air or PINSTACK. Less intimate than small party studios but more exciting for older kids. All activities are indoors and weather-proof.'
  },
  'Urban Air': {
    match: (name) => name.toLowerCase().includes('urban air'),
    take: 'Best for high-energy kids who love jumping, climbing, and obstacle courses. Indoor adventure park with all-inclusive party packages.',
    price_note: '~$25-45 per child · Party packages',
    what_to_expect: 'Party packages include 90 minutes of park access (trampolines, climbing walls, obstacle courses, dodgeball) plus 30 minutes in a private party room with food. Grip socks required (available for purchase). Typical groups are 10-20 kids. Book 2-3 weeks ahead for weekends.',
    good_fit: 'Your child is 4-14 years old\nYou want a high-energy, active party\nYour child loves jumping, climbing, and obstacle courses\nYou want everything handled (activities + food + cleanup)\nYour group is 10-20 kids',
    how_it_compares: 'More diverse attractions than Pump It Up (trampolines only). Similar pricing to Main Event but more physically active. Indoor and climate-controlled. Grip socks are an extra cost some parents don\'t expect. Louder and more chaotic than structured party venues \u2014 great for energy, harder for conversation.'
  },

  // --- KIDS HAIRCUTS ---
  'Pigtails & Crewcuts': {
    match: (name) => name.toLowerCase().includes('pigtails'),
    take: 'Best for stress-free first haircuts and young kids. Themed chairs, TV screens, and patient stylists who specialize in children.',
    price_note: '~$22-35 per haircut',
    what_to_expect: 'Walk-ins and appointments available. Kids sit in themed chairs (cars, airplanes) and watch their favorite show during the cut. Stylists are trained to work with nervous or wiggly kids. First haircut packages include a certificate and lock of hair. Typical visit is 15-20 minutes.',
    good_fit: 'Your child is getting their first haircut\nYour child is nervous or anxious about haircuts\nYou want a salon designed specifically for kids\nYou prefer themed chairs and entertainment during the cut\nYour child is under 10',
    how_it_compares: 'More kid-focused than regular salons or barber shops. Similar to Snip-its and Sharkey\'s in concept. Slightly pricier than a standard haircut but includes the kid-friendly experience. Much less stressful than taking a toddler to an adult salon.'
  },
  'Snip-its': {
    match: (name) => name.toLowerCase().includes('snip-its'),
    take: 'Best for making haircuts fun for young kids. Interactive experience with games, prizes, and kid-trained stylists.',
    price_note: '~$24-35 per haircut',
    what_to_expect: 'Appointments and walk-ins available. Kids choose from themed stations and can play games during their cut. A "Magic Box" dispenses a prize after each haircut. Stylists specialize in children\'s hair. First haircut packages available. Also offers ear piercing and party packages.',
    good_fit: 'Your child needs a fun, distraction-filled haircut experience\nYour child is under 12\nYou want a place that rewards kids after the cut\nYour child has had bad experiences at regular salons\nYou want a first haircut ceremony',
    how_it_compares: 'The "Magic Box" prize is a unique draw that kids love. Similar pricing to Pigtails & Crewcuts. More interactive experience than Sharkey\'s. Also offers ear piercing and party packages that competitors don\'t always have.'
  },
  'Sharkeys': {
    match: (name) => name.toLowerCase().includes('sharkey'),
    take: 'Best for kids who want a fun salon experience with video games and entertainment. Franchise with consistent quality.',
    price_note: '~$22-32 per haircut',
    what_to_expect: 'Walk-ins and appointments available. Kids sit in fun chairs and can play video games or watch TV during their cut. Stylists are trained for children. Offers haircuts, updos, braids, and first haircut packages. Typical visit is 15-25 minutes. Some locations also offer spa parties.',
    good_fit: 'Your child loves video games and wants entertainment during haircuts\nYour child is under 14\nYou want a reliable franchise experience\nYou prefer appointments but also need walk-in flexibility\nYour child wants more than just a basic cut (braids, updos)',
    how_it_compares: 'Video game focus differentiates from Pigtails & Crewcuts (themed chairs) and Snip-its (prize box). Slightly more affordable than competitors. Consistent franchise quality across locations. Less "babyish" than some kid salons, which appeals to older kids.'
  },

  // --- ADDITIONAL DAYCARES & PRESCHOOLS ---
  'Goddard School': {
    match: (name) => name.toLowerCase().includes('goddard school'),
    take: 'Best for families wanting a play-based, STEAM-focused preschool with a home-like feel. Nationally accredited with strong teacher retention.',
    price_note: '~$1,200-1,700/mo · Full-time enrollment',
    what_to_expect: 'Uses a proprietary play-based STEAM curriculum (F.L.EX. Learning Program). Classrooms are designed to feel warm and homelike, not institutional. Full-day programs from 7am-6pm with meals included. Low teacher-to-child ratios. Expect daily activity reports, regular parent-teacher conferences, and enrichment activities like yoga and music.',
    good_fit: 'Your child is 6 weeks to 6 years old\nYou want a play-based approach with STEAM integration\nYou value low turnover and experienced teachers\nYou prefer a warm, homelike environment over a corporate feel\nYou want a nationally accredited program (NAEYC)',
    how_it_compares: 'More play-based than Primrose (which is more structured/academic). Similar pricing tier. Known for better teacher retention than many franchise competitors. Unlike Montessori (child-directed with specific materials), Goddard blends play with teacher-guided STEAM activities. Smaller, more intimate feel than KinderCare.'
  },
  'Kids R Kids': {
    match: (name) => name.toLowerCase().includes("kids r kids") || name.toLowerCase().includes("kids 'r' kids"),
    take: 'Best for families wanting a full-service childcare center with a character-development curriculum. Structured programs from infant through pre-K.',
    price_note: '~$1,000-1,500/mo · Full-time enrollment',
    what_to_expect: 'Uses the proprietary Brain Waves curriculum covering academics, character, and fitness. Full-day programs from 6:30am-6:30pm. Classrooms organized by age. Meals and snacks included. Features an on-site indoor playground. Daily parent communication via app. Summer camp programs for school-age kids.',
    good_fit: 'Your child is 6 weeks to 12 years old\nYou need full-day care with extended hours\nYou want character development built into the curriculum\nYou prefer an established franchise with consistent standards\nYou need before/after school care for older kids too',
    how_it_compares: 'More affordable than Primrose or Goddard. The Brain Waves curriculum adds a character-development layer that pure academic programs lack. Extended hours (6:30am-6:30pm) are more generous than some competitors. Offers school-age programs that many preschool-only centers don\'t.'
  },
  'Creme de la Creme': {
    match: (name) => name.toLowerCase().includes('crème de la crème') || name.toLowerCase().includes('creme de la creme'),
    take: 'The most premium childcare franchise in the area. Resort-style facilities with enrichment classes included. Best for families who want everything under one roof.',
    price_note: '~$1,500-2,200/mo · Full-time enrollment',
    what_to_expect: 'State-of-the-art facilities with an indoor gym, splash pad, and enrichment studios. Curriculum covers academics, foreign language, music, and fitness. Full-day programs with meals by an on-site chef. Low teacher-to-child ratios. Daily updates via parent app. Enrichment classes (dance, art, STEM) included in tuition.',
    good_fit: 'You want the highest-end childcare experience available\nYour child is 6 weeks to 5 years old\nYou want enrichment activities (music, language, art) included\nYou prefer resort-style facilities with outdoor play areas\nBudget is secondary to quality and convenience',
    how_it_compares: 'The most expensive franchise childcare option but also the most comprehensive. Unlike Primrose or Goddard (standard facilities), Creme de la Creme has resort-like amenities. Enrichment classes that cost extra at other schools are included here. Better facilities than any competitor but at a significant premium.'
  },
  'Cadence Academy': {
    match: (name) => name.toLowerCase().includes('cadence academy'),
    take: 'Best for families wanting a curriculum-based preschool at a mid-range price. Solid academics without the premium franchise markup.',
    price_note: '~$900-1,300/mo · Full-time enrollment',
    what_to_expect: 'Uses the Ascend Curriculum covering literacy, math, science, and social-emotional development. Full-day programs with meals included. Classrooms organized by age. Daily activity reports. Enrichment activities rotate monthly. Parent events and conferences scheduled quarterly.',
    good_fit: 'You want a quality preschool without paying premium franchise prices\nYour child is 6 weeks to 5 years old\nYou value a structured, curriculum-based approach\nYou want meals and enrichment included\nYou prefer a smaller, less corporate feel',
    how_it_compares: 'More affordable than Primrose, Goddard, or Creme de la Creme. Quality curriculum but less brand recognition. Good middle ground between premium franchises and independent daycares. Less structured than Montessori but more academic than play-only programs.'
  },
  'Everbrook Academy': {
    match: (name) => name.toLowerCase().includes('everbrook academy'),
    take: 'Best for families wanting KinderCare quality in a newer, smaller-format school. Same parent company (KinderCare Learning Companies) with a boutique feel.',
    price_note: '~$1,100-1,500/mo · Full-time enrollment',
    what_to_expect: 'Same research-backed curriculum as KinderCare but in newer, purpose-built facilities. Full-day programs from 6:30am-6:30pm. Meals and snacks included. Modern classrooms with natural light and outdoor play areas. Daily reports via parent app. STEM and creative enrichment integrated into daily schedule.',
    good_fit: 'You want KinderCare quality in a newer facility\nYour child is 6 weeks to 5 years old\nYou prefer a modern, purpose-built learning environment\nYou need extended hours for your work schedule\nYou want a proven curriculum from an established company',
    how_it_compares: 'Same parent company as KinderCare with identical curriculum quality. Newer facilities designed from the ground up (vs. KinderCare\'s older retrofitted locations). Similar pricing. Less brand recognition than KinderCare but often nicer physical spaces.'
  },
  'Childrens Lighthouse': {
    match: (name) => name.toLowerCase().includes("children's lighthouse"),
    take: 'Best for families wanting a values-based preschool with a strong character-development focus. Texas-founded franchise with a family-oriented culture.',
    price_note: '~$1,000-1,400/mo · Full-time enrollment',
    what_to_expect: 'Uses a proprietary curriculum integrating academics with character education (honesty, kindness, responsibility). Full-day programs with meals included. Classrooms by age group. Daily communication via parent app. Monthly character themes. Summer camp programs for school-age children.',
    good_fit: 'You want character education woven into daily learning\nYour child is 6 weeks to 12 years old\nYou prefer a Texas-based franchise with local roots\nYou want before/after school care options\nYou value a family-oriented, values-driven culture',
    how_it_compares: 'More values-focused than KinderCare or Learning Experience. Similar pricing to Kids R Kids. Texas-founded, so many locations in DFW area. Less premium than Primrose or Creme de la Creme but more structured than independent daycares.'
  },
  'Adventure Kids': {
    match: (name) => name.toLowerCase().includes('adventure kids'),
    take: 'Best for families needing flexible drop-in childcare. Not a full-time preschool — designed for hourly, part-time, and date-night care.',
    price_note: '~$12-18/hr · Drop-in · No enrollment required',
    what_to_expect: 'Drop-in childcare center — no reservations or enrollment needed (though you can reserve online). Kids play in themed rooms with structured activities. Staff supervise and engage children. Typical stays are 2-6 hours. Some locations offer Parents\' Night Out events on weekends. Ages 6 weeks to 12 years.',
    good_fit: 'You need occasional childcare without a full-time commitment\nYou want date-night or errand-running childcare\nYour child is 6 weeks to 12 years old\nYou prefer pay-as-you-go over monthly tuition\nYou need backup care when your regular arrangement falls through',
    how_it_compares: 'Completely different model from Primrose, KinderCare, etc. (hourly vs. monthly enrollment). No curriculum — it\'s supervised play, not school. More affordable for occasional use but expensive if used full-time. The only franchise option for true drop-in childcare in the area.'
  },
  'Celebree School': {
    match: (name) => name.toLowerCase().includes('celebree school'),
    take: 'Best for families wanting a curriculum-based preschool with a strong focus on kindergarten readiness. Growing franchise with modern facilities.',
    price_note: '~$1,100-1,500/mo · Full-time enrollment',
    what_to_expect: 'Uses a proprietary curriculum focused on school readiness. Full-day programs with age-grouped classrooms. Meals and snacks included. STEM activities integrated into daily schedule. Daily parent communication. Regular assessments to track developmental milestones.',
    good_fit: 'You want a strong kindergarten-readiness program\nYour child is 6 weeks to 12 years old\nYou want modern facilities with current learning technology\nYou prefer a structured, assessment-based approach\nYou value clear developmental milestone tracking',
    how_it_compares: 'Newer franchise than Primrose or Goddard — facilities tend to be very modern. Similar pricing to KinderCare. Strong kindergarten readiness focus sets it apart from play-based programs. Less established brand but often has availability when competitors have waitlists.'
  },

  // --- ADDITIONAL KIDS ACTIVITIES ---
  'British Swim School': {
    match: (name) => name.toLowerCase().includes('british swim school'),
    take: 'Best for babies and toddlers learning water survival skills. Unique "survival-first" approach teaches floating and breathing before strokes.',
    price_note: '~$70-100/mo · Weekly 30-min lessons',
    what_to_expect: 'Lessons are 30 minutes, once per week in a partner pool (often a hotel or fitness center pool). The curriculum focuses on water survival first — babies learn to roll, float, and breathe before learning strokes. Classes start as young as 3 months. Small groups (4-6 kids). Parents participate in infant/toddler classes.',
    good_fit: 'Your baby or toddler is 3 months to 5 years old\nYou prioritize water survival skills above stroke technique\nYou want your infant to learn to float and self-rescue\nYou\'re comfortable with lessons in a shared pool facility\nYou want an affordable introduction to water safety',
    how_it_compares: 'The survival-first approach is unique — Aqua-Tots and Emler focus more on stroke development. Uses partner pools (hotels, gyms) rather than dedicated facilities, which means water temps and pool quality vary. More affordable than dedicated swim school franchises. Best for very young children; older kids may outgrow the program faster.'
  },
  'Big Blue Swim School': {
    match: (name) => name.toLowerCase().includes('big blue swim'),
    take: 'Best for kids who need a modern, tech-enhanced swim experience. Real-time progress tracking and warm-water pools designed for learning.',
    price_note: '~$90-130/mo · Weekly 30-min lessons',
    what_to_expect: 'Lessons are 30 minutes in a purpose-built warm-water pool (90°F). Small class sizes (3-4 kids per instructor). Uses a proprietary skill-tracking app so parents can monitor progress in real time. Levels progress from water introduction through competitive prep. Observation area for parents. Makeup lessons available.',
    good_fit: 'Your child is 3 months to 12 years old\nYou want to track your child\'s swim progress via an app\nYou prefer a dedicated, purpose-built swim facility\nYou want warm water for young or cold-sensitive kids\nYou value small class sizes with measurable milestones',
    how_it_compares: 'More tech-forward than Aqua-Tots or Emler — the progress-tracking app is a differentiator. Purpose-built facilities (vs. British Swim School\'s partner pools). Similar pricing to Emler, slightly more than SafeSplash. Modern facilities with a premium feel.'
  },
  'Goldfish Swim School': {
    match: (name) => name.toLowerCase().includes('goldfish swim'),
    take: 'Best for families wanting a premium swim experience with tropical-themed facilities. Warm pools, small classes, and a fun environment.',
    price_note: '~$85-125/mo · Weekly 30-min lessons',
    what_to_expect: 'Lessons in a 90°F tropical-themed pool. Classes are 30 minutes with max 4 kids per instructor. Shiver-free changing rooms and warm-water showers. Levels range from infant water introduction through competitive prep. Family swim times available outside lesson hours. Birthday party packages offered.',
    good_fit: 'Your child is 4 months to 12 years old\nYou want a fun, tropical-themed swim environment\nYou prefer warm water and warm changing facilities\nYou want family swim time outside of lesson hours\nYour child responds well to a playful learning atmosphere',
    how_it_compares: 'The tropical theme and warm facilities set it apart from more utilitarian swim schools. Similar class sizes and pricing to Emler and Big Blue. Family swim time is a bonus most competitors don\'t offer. Purpose-built facilities unlike British Swim School\'s shared pools.'
  },
  'Fred Astaire Dance': {
    match: (name) => name.toLowerCase().includes('fred astaire'),
    take: 'Best for kids interested in ballroom and social dance. Professional instruction in a variety of dance styles with performance opportunities.',
    price_note: '~$120-200/mo · Weekly classes',
    what_to_expect: 'Classes include ballroom, Latin, swing, and social dance styles. Group classes are typically 45-60 minutes, once or twice per week. Private lessons also available. Students learn technique, musicality, and partner work. Recitals and showcases held periodically. All skill levels welcome.',
    good_fit: 'Your child is interested in ballroom or social dance styles\nYour child is 7-18 years old\nYou want professional-quality dance instruction\nYour child enjoys performing and showcases\nYou want your child to develop social confidence through dance',
    how_it_compares: 'Unlike recreational dance studios (ballet/hip-hop focus), Fred Astaire specializes in ballroom and social dance. More structured and technique-focused than community dance programs. Premium pricing reflects professional-grade instruction. Good for kids who want dance as a social skill, not just a performance art.'
  },
  'KidStrong': {
    match: (name) => name.toLowerCase().includes('kidstrong'),
    take: 'Best for developing physical and mental strength in young kids through science-based movement classes. Not a traditional gym — it\'s brain + body training.',
    price_note: '~$150-200/mo · Weekly classes',
    what_to_expect: 'Classes are 45 minutes, once per week, grouped by age and developmental stage. Curriculum is based on pediatric milestones covering physical, cognitive, and character development. Activities include obstacle courses, agility drills, and problem-solving challenges. Coaches track developmental progress. Free trial class available.',
    good_fit: 'Your child is 1-11 years old\nYou want a program that develops both physical and mental skills\nYou prefer science-based curriculum over free play\nYour child loves obstacle courses and physical challenges\nYou want measurable developmental progress tracking',
    how_it_compares: 'Unlike gymnastics or sports leagues (skill-specific), KidStrong focuses on overall physical and cognitive development. More structured than open-play gyms like We Rock the Spectrum. Coaches track developmental milestones, which most activity programs don\'t. Premium pricing but a unique concept.'
  },
  'We Rock the Spectrum': {
    match: (name) => name.toLowerCase().includes('we rock the spectrum'),
    take: 'Best for sensory-friendly play and parties. Inclusive gym designed for all kids, including those with autism and sensory needs.',
    price_note: '~$12-18/visit · Day passes · Memberships available',
    what_to_expect: 'Indoor sensory gym with zip lines, trampolines, climbing walls, and sensory-specific equipment. Open play sessions (no structured classes). Designed to be inclusive for kids with autism, ADHD, and sensory processing differences. Also welcomes neurotypical kids. Birthday party packages available. Calmer, less chaotic environment than typical play spaces.',
    good_fit: 'Your child has sensory processing needs or autism\nYou want an inclusive play space that welcomes all abilities\nYour child is overwhelmed by loud, crowded play spaces\nYou want a sensory-friendly birthday party venue\nYour child enjoys climbing, swinging, and tactile play',
    how_it_compares: 'The only franchise specifically designed for sensory-inclusive play. Unlike Urban Air or trampoline parks (loud, chaotic), We Rock the Spectrum is calmer and more controlled. Open play format rather than structured classes. More expensive per visit than public playgrounds but provides specialized equipment not available elsewhere.'
  },
  'Challenge Island': {
    match: (name) => name.toLowerCase().includes('challenge island'),
    take: 'Best for kids who love building and problem-solving. STEAM enrichment through collaborative challenges using everyday materials.',
    price_note: '~$150-250 per session series · After-school and camps',
    what_to_expect: 'Programs run as after-school enrichment, camps, and birthday parties. Each session presents a themed STEAM challenge that kids solve in teams using everyday materials. Sessions are 60-90 minutes. No screens — all hands-on building and problem-solving. Themes rotate seasonally. Available at schools, community centers, and their own locations.',
    good_fit: 'Your child loves building, tinkering, and problem-solving\nYour child is 4-14 years old\nYou want STEAM enrichment without screens\nYou prefer collaborative, team-based learning\nYou want a creative after-school or camp option',
    how_it_compares: 'Unlike coding programs (iCode, screen-based), Challenge Island is entirely hands-on with no technology. Unlike science tutoring, it\'s project-based and collaborative. More creative and less structured than traditional STEM programs. Often available at schools as an after-school enrichment, which is convenient for pickup.'
  },
  'Club SciKidz': {
    match: (name) => name.toLowerCase().includes('club scikidz'),
    take: 'Best for kids who love science experiments and hands-on discovery. STEM camps and after-school programs with real lab experiences.',
    price_note: '~$200-350 per camp week · After-school programs available',
    what_to_expect: 'Programs include summer camps, spring break camps, and after-school enrichment. Each session is themed (rockets, robots, chemistry, etc.) with hands-on experiments. Kids wear lab coats and use real science equipment. Full-day camps run 9am-4pm with before/after care options. Small groups with trained instructors.',
    good_fit: 'Your child is fascinated by science experiments\nYour child is 4-12 years old\nYou want a STEM-focused summer camp or after-school program\nYour child loves hands-on activities over lectures\nYou want themed weeks that keep things fresh',
    how_it_compares: 'More science-experiment focused than Challenge Island (which uses everyday materials). Unlike coding programs (iCode), Club SciKidz covers physical science, chemistry, and biology. Camp format means a deeper immersion than weekly classes. Themed weeks prevent repetition across multiple camp enrollments.'
  },
  'iCode': {
    match: (name) => name.toLowerCase().includes('icode'),
    take: 'Best for kids who want to learn coding, robotics, and game design. Project-based STEM programs with real programming languages.',
    price_note: '~$150-250/mo · Weekly classes · Camps available',
    what_to_expect: 'Weekly classes are 60-90 minutes covering coding (Scratch, Python, JavaScript), robotics, game design, and cybersecurity. Students work on projects they can show and share. Classes grouped by age and skill level. Summer and break camps available for deeper dives. Small class sizes with certified instructors.',
    good_fit: 'Your child is interested in coding, gaming, or robotics\nYour child is 6-18 years old\nYou want a structured tech education beyond school offerings\nYour child wants to build real projects (games, apps, robots)\nYou prefer small class sizes with hands-on instruction',
    how_it_compares: 'Unlike Challenge Island (no-screen STEAM), iCode is screen-based with real programming. More structured than self-paced online coding platforms (Code.org, Scratch). Multiple locations in Plano/Frisco area. Broader curriculum than robotics-only programs. Camp format available for intensive learning during breaks.'
  },
  'Bricks Bots & Beakers': {
    match: (name) => name.toLowerCase().includes('bricks bots'),
    take: 'Best for younger kids who love LEGO and want an introduction to engineering and robotics concepts through play-based building.',
    price_note: '~$150-250 per camp week · After-school programs',
    what_to_expect: 'Programs use LEGO, robotics kits, and science experiments as learning tools. After-school enrichment and camp formats. Sessions are 60-90 minutes. Kids build, program, and experiment in themed activities. Small groups with hands-on instruction. Themes rotate to keep experiences fresh.',
    good_fit: 'Your child loves LEGO and building\nYour child is 4-12 years old\nYou want a STEM introduction through play\nYour child is too young for serious coding programs\nYou want hands-on engineering concepts without heavy academics',
    how_it_compares: 'More play-based than iCode (real programming). Better for younger kids who aren\'t ready for screen-based coding. Similar to Challenge Island in the hands-on approach but more focused on LEGO and robotics specifically. Good stepping stone before moving to formal coding programs.'
  },

  // --- ADDITIONAL BIRTHDAY PARTY VENUES ---
  'Pump It Up': {
    match: (name) => name.toLowerCase().includes('pump it up'),
    take: 'Best for younger kids who love bouncing. Private inflatable arenas mean your party has the whole space — no sharing with strangers.',
    price_note: '~$20-35 per child · Private party',
    what_to_expect: 'Private party — your group gets the entire inflatable arena. Typical party is 90 minutes: 50 minutes of jumping in the inflatable room, then 40 minutes in a private party room for food and cake. Staff handles setup and cleanup. Accommodates 10-25+ kids. Socks required (no shoes on inflatables).',
    good_fit: 'Your child is 2-10 years old\nYou want a private party where your group has the whole space\nYour child loves bouncing, sliding, and inflatable obstacles\nYou don\'t want to plan activities — just let kids jump\nYou want zero cleanup responsibility',
    how_it_compares: 'Unlike Urban Air or trampoline parks, Pump It Up parties are fully private — no other groups sharing the space. Less variety than Main Event (no bowling/arcade) but more private. Simpler and less overwhelming for younger kids. More affordable than most multi-activity venues.'
  },
  'Crayola Experience': {
    match: (name) => name.toLowerCase().includes('crayola experience'),
    take: 'Best for creative kids who love coloring, crafting, and art. Hands-on art experiences with 25+ activities. Great for younger kids.',
    price_note: '~$25-35 per child admission · Party packages from $30/child',
    what_to_expect: 'Interactive attraction with 25+ hands-on activities: melt crayons into custom shapes, name and wrap your own crayon, create digital art, star in a coloring page, and more. Party packages include admission, a private party room, food, and a goodie bag. General admission visits typically last 2-3 hours. Located in The Shops at Willow Bend.',
    good_fit: 'Your child loves art, coloring, and crafting\nYour child is 3-12 years old\nYou want a unique, creative party experience\nYou prefer hands-on activities over pure physical play\nYou want something different from the usual bounce/trampoline party',
    how_it_compares: 'Completely unique — no direct competitor in the area. Unlike bounce houses or trampoline parks, Crayola is creative and calm. Good for kids who aren\'t into high-energy physical activities. The only Crayola Experience in Texas (Plano location). More expensive than basic party venues but a truly one-of-a-kind experience.'
  },
  'PINSTACK': {
    match: (name) => name.toLowerCase().includes('pinstack'),
    take: 'Best for older kids and teens who want a premium entertainment experience. Upscale bowling, laser tag, arcade, and more under one roof.',
    price_note: '~$30-50 per child · Party packages',
    what_to_expect: 'Premium entertainment center with bowling, laser tag, bumper cars, rock climbing, arcade, and VR experiences. Party packages include a dedicated party host, private event space, food, and choice of activities. Modern, upscale environment. Typical party is 2 hours. Best for groups of 8-20+ kids.',
    good_fit: 'Your child is 8-16 years old\nYou want an upscale, premium party experience\nYou want variety — bowling, laser tag, climbing, and more\nYou prefer a modern, clean venue over casual entertainment centers\nYour teen wants a "cool" party, not a little-kid party',
    how_it_compares: 'More upscale than Main Event or Strikz — premium food and modern design. Higher price point reflects the elevated experience. Similar activity mix to Main Event but nicer facilities. Best for older kids and teens who\'d find bounce houses or kid-themed venues too young.'
  },
  'Strikz Entertainment': {
    match: (name) => name.toLowerCase().includes('strikz'),
    take: 'Best for families wanting bowling, laser tag, and arcade fun in a locally-known venue. Solid party packages with a fun, casual vibe.',
    price_note: '~$20-35 per child · Party packages',
    what_to_expect: 'Entertainment center with bowling, laser tag, arcade games, and a sports bar for parents. Party packages include bowling lanes, shoe rental, food, and a party room. Typical party is 2 hours. Staff handles setup. Walk-in play also available. Located in Frisco.',
    good_fit: 'Your child is 5-14 years old\nYou want bowling + laser tag + arcade in one place\nYou prefer a casual, fun atmosphere\nYour group is 8-20 kids\nYou want good value without premium pricing',
    how_it_compares: 'More affordable than PINSTACK (similar activities, less upscale). Similar to Main Event in offerings but smaller and more local. Good value for a multi-activity party. The Frisco location is convenient for local families.'
  },
  'Tumbles': {
    match: (name) => name.toLowerCase().includes('tumbles'),
    take: 'Best for toddlers and young kids who love tumbling and open play. STEM-infused classes and a great party venue for little ones.',
    price_note: '~$20-30 per child · Party packages',
    what_to_expect: 'Indoor play and tumbling center for young kids. Classes include tumbling, STEM exploration, and art. Open play sessions available. Birthday parties include private use of the play space, a party room, and staff to run activities. Sensory-friendly environment. Most activities designed for ages 1-8.',
    good_fit: 'Your child is 1-8 years old\nYou want a party venue designed for very young kids\nYour child loves tumbling and physical play\nYou want a calmer, smaller environment than big bounce parks\nYou prefer staff-led activities over free-for-all play',
    how_it_compares: 'Better for very young kids (1-5) than Urban Air or Pump It Up. Smaller and less overwhelming. STEM classes are a nice addition that pure play spaces don\'t offer. Less exciting for older kids but perfect for toddler birthdays. More structured than open-play gyms.'
  },
  'Romp n Roll': {
    match: (name) => name.toLowerCase().includes('romp n'),
    take: 'Best for babies and toddlers who need active play classes. Music, art, and gym classes designed for early development. Great toddler party venue.',
    price_note: '~$20-30 per child · Party packages · Classes ~$150-200/mo',
    what_to_expect: 'Classes include gym, music, art, and dance for kids 3 months to 5 years. Birthday parties include private gym time, a party room, and a staff-led activity. Classes are 45 minutes. Small groups. Parent participation required for younger ages. Drop-off classes available for 3+.',
    good_fit: 'Your child is 3 months to 5 years old\nYou want developmental play classes (gym, music, art)\nYou want a birthday party designed for toddlers\nYou prefer small, intimate classes over large groups\nYou want parent-child bonding activities',
    how_it_compares: 'More class-focused than pure play spaces like Tumbles. Better for babies and toddlers than any bounce house or trampoline park. Combines gym, music, and art in one place. Similar to Gymboree (now mostly closed) in concept. Party venue is cozy and age-appropriate for little ones.'
  },
  'Play Street Museum': {
    match: (name) => name.toLowerCase().includes('play street museum'),
    take: 'Best for imaginative play in a curated, museum-like environment. Themed rooms let kids role-play as doctors, chefs, mechanics, and more.',
    price_note: '~$14-18/visit · Memberships available · Parties from $25/child',
    what_to_expect: 'Indoor play museum with themed rooms — kids can play doctor, shop at a grocery store, cook in a kitchen, build at a construction site, etc. Open play sessions and memberships available. Birthday parties include private museum access and a party room. Best for ages 1-8. Clean, curated environment. Each location has unique themes.',
    good_fit: 'Your child loves imaginative, role-playing activities\nYour child is 1-8 years old\nYou want a creative play space that\'s not just bouncing and climbing\nYou prefer a clean, curated environment over chaotic play spaces\nYou want a unique party venue that encourages creativity',
    how_it_compares: 'Completely different from bounce houses and trampoline parks — imaginative play, not physical play. Similar concept to children\'s museums but smaller and more intimate. Texas-founded franchise. More creative and educational than open-play gyms. Best for younger, imaginative kids; less appeal for older action-oriented kids.'
  },

  // --- ADDITIONAL FAMILY RESTAURANTS ---
  'Chuys': {
    match: (name) => name.toLowerCase().includes("chuy's"),
    take: 'Best family-friendly Tex-Mex in the area. Kids eat free on certain nights, generous portions, and a fun, quirky atmosphere kids love.',
    price_note: '~$10-16 per adult · Kids menu $5-7 · Kids eat free promotions',
    what_to_expect: 'Tex-Mex restaurant with a fun, eclectic atmosphere (Elvis shrine, vintage decor). Full kids menu with Tex-Mex favorites. Chips and salsa are complimentary. Portions are large and shareable. Highchairs and booster seats available. Kids eat free on select nights (check location). Casual, noisy environment that\'s forgiving of kid noise.',
    good_fit: 'Your family loves Tex-Mex food\nYou want a casual, loud environment where kids can be kids\nYou appreciate generous portions and good value\nYou want complimentary chips and salsa\nYou\'re looking for kids-eat-free deals',
    how_it_compares: 'More fun and quirky atmosphere than standard Tex-Mex chains. Better value than upscale restaurants like Seasons 52. Kids-eat-free nights make it one of the most affordable family dining options. Louder and more casual than Flower Child or Tupelo Honey — which is actually a plus with young kids.'
  },
  'Lazy Dog': {
    match: (name) => name.toLowerCase().includes('lazy dog'),
    take: 'Best for families who want craft comfort food in a lodge-inspired setting. Great kids menu, dog-friendly patio, and a relaxed vibe.',
    price_note: '~$14-22 per adult · Kids menu $7-9',
    what_to_expect: 'Craft American comfort food in a rustic, lodge-inspired setting. Full kids menu with healthy options. Dog-friendly patio (they\'ll bring your pup a bowl of water and a treat). Handcrafted cocktails and craft beer for parents. Portions are generous. Crayons and coloring for kids. Seasonal rotating menu keeps things fresh.',
    good_fit: 'Your family wants upscale comfort food in a relaxed setting\nYou want a restaurant that welcomes dogs on the patio\nYou appreciate craft cocktails and good beer\nYou want a full kids menu with quality options (not just nuggets)\nYou prefer a lodge-like atmosphere over a chain restaurant feel',
    how_it_compares: 'More upscale than casual chains but not fine dining. Better kids menu quality than most family restaurants. The dog-friendly patio is unique. More relaxed than Seasons 52 or Maggiano\'s. Great middle ground between fast-casual and sit-down dining.'
  },
  'Maggianos': {
    match: (name) => name.toLowerCase().includes("maggiano"),
    take: 'Best for family celebrations and large groups. Family-style Italian portions are huge and shareable — great value for bigger parties.',
    price_note: '~$18-30 per adult · Kids menu $10-12 · Family-style portions feed 2-3',
    what_to_expect: 'Classic Italian-American restaurant with family-style portions. Pastas, chicken parm, and signature dishes served on large platters to share. Kids menu available. Semi-private dining rooms for celebrations. Portions are famously large — plan to take leftovers. Reservations recommended for weekends.',
    good_fit: 'You\'re celebrating a birthday, graduation, or family milestone\nYour group is 6+ people who can share family-style platters\nYour family loves Italian food\nYou want leftovers to take home\nYou need a semi-private dining space for a group',
    how_it_compares: 'Best for large groups and celebrations — family-style sharing makes it perfect for parties. More formal and expensive than Olive Garden. Better value than it appears because portions feed 2-3 people. Not the best choice for a quick weeknight dinner (go to Flower Child for that).'
  },
  'Seasons 52': {
    match: (name) => name.toLowerCase().includes('seasons 52'),
    take: 'Best for a grown-up dining experience when you have kids in tow. Seasonally-inspired menu with nothing over 595 calories. Upscale but kid-tolerant.',
    price_note: '~$20-35 per adult · Kids menu $8-10',
    what_to_expect: 'Upscale-casual restaurant with a seasonally rotating menu. Every dish is under 595 calories. Flatbreads, wood-grilled fish, and an acclaimed wine list. Kids menu available but this is primarily an adult-oriented restaurant. Mini desserts in shot glasses are a hit with kids. Reservations recommended.',
    good_fit: 'You want an upscale meal but can\'t get a sitter\nYour kids are well-behaved in quieter restaurant settings\nYou appreciate healthy, calorie-conscious dining\nYou enjoy wine pairings and craft cocktails\nYou want a date-night feel even with kids along',
    how_it_compares: 'More upscale than Chuy\'s or Lazy Dog — this is closer to fine dining. The calorie-conscious menu is unique. Better for older, calmer kids (not ideal for toddlers). Mini desserts are a treat kids love. Most expensive family dinner option on this list but a special-occasion experience.'
  },
  'Tupelo Honey': {
    match: (name) => name.toLowerCase().includes('tupelo honey'),
    take: 'Best for families who love Southern comfort food with a modern twist. Great brunch spot. Welcoming atmosphere with quality ingredients.',
    price_note: '~$14-24 per adult · Kids menu $7-9',
    what_to_expect: 'Southern-inspired restaurant with scratch-made dishes using local ingredients. Famous for brunch (chicken & waffles, shrimp & grits). Full kids menu. Warm, welcoming atmosphere. Craft cocktails for parents. Seasonal menu rotations. Can get busy at brunch — reservations recommended on weekends.',
    good_fit: 'Your family loves Southern comfort food\nYou\'re looking for a great family brunch spot\nYou appreciate scratch-made food with quality ingredients\nYou want a warm, welcoming atmosphere\nYou enjoy craft cocktails with your meal',
    how_it_compares: 'Best brunch option on this list. More upscale than Chuy\'s, more casual than Seasons 52. Southern-focused menu is unique in the area. Better ingredient quality than casual chains. Can be a wait at weekend brunch — go early or make reservations.'
  },
  'Flower Child': {
    match: (name) => name.toLowerCase().includes('flower child'),
    take: 'Best for health-conscious families who want nutritious food kids will actually eat. Fast-casual with organic, gluten-free, and vegan options.',
    price_note: '~$12-16 per adult · Kids menu $6-8',
    what_to_expect: 'Fast-casual restaurant focused on healthy, whole-ingredient dishes. Bowls, salads, wraps, and plates with organic and locally-sourced ingredients. Extensive dietary options: gluten-free, vegan, paleo, and vegetarian clearly labeled. Kids menu with portions they\'ll actually finish. Counter-service ordering, food brought to your table.',
    good_fit: 'Your family prioritizes healthy, whole-food eating\nYou have dietary restrictions (GF, vegan, paleo)\nYou want a quick, healthy meal without a long sit-down wait\nYour kids are open to trying foods beyond chicken nuggets\nYou prefer fast-casual over full-service dining',
    how_it_compares: 'Healthiest option on this list by far. Faster than sit-down restaurants (15-20 minutes from order to food). More affordable than Seasons 52 or Tupelo Honey. Better for weeknight dinners than celebrations. The clear dietary labeling makes it the easiest choice for families with food allergies or restrictions.'
  },
  'Cane Rosso': {
    match: (name) => name.toLowerCase().includes('cane rosso'),
    take: 'Best for families who love authentic Neapolitan pizza. Wood-fired pies made with imported Italian ingredients. Casual enough for kids, good enough for foodies.',
    price_note: '~$14-20 per pizza · Kids menu available',
    what_to_expect: 'Neapolitan-style pizzeria with a wood-fired oven. Pizzas are individual-sized (10-12 inches). Menu includes salads, antipasti, and desserts. Full bar with craft cocktails. Casual, hip atmosphere. Crayons and kids menu available. Good patio seating when weather permits.',
    good_fit: 'Your family loves authentic pizza (not chain pizza)\nYou appreciate imported Italian ingredients and wood-fired cooking\nYou want a casual, hip atmosphere that works for all ages\nYou enjoy a good cocktail or craft beer with dinner\nYour kids are adventurous eaters or love pizza',
    how_it_compares: 'Better pizza quality than any chain. More casual and kid-friendly than fine Italian restaurants. Individual pizzas mean everyone gets what they want. More affordable than Maggiano\'s for a weeknight dinner. The wood-fired oven and imported ingredients set it apart from typical pizza places.'
  },

  // --- ADDITIONAL KIDS HAIRCUTS & CLOTHING ---
  'Kid to Kid': {
    match: (name) => name.toLowerCase().includes('kid to kid'),
    take: 'Best for budget-conscious families who want quality secondhand kids\' clothing, toys, and gear. Buy and sell — great for fast-growing kids.',
    price_note: 'Resale · 50-70% off retail · Also buys your gently used items',
    what_to_expect: 'Resale store specializing in kids\' clothing (newborn-teen), toys, shoes, and baby gear. Items are inspected for quality before being sold. You can also sell your gently-used items for cash or store credit. Inventory changes frequently — each visit is different. Well-organized by size and season.',
    good_fit: 'You want quality kids\' clothes at a fraction of retail prices\nYour kids outgrow clothes faster than they wear them out\nYou want to sell or trade in items your kids have outgrown\nYou prefer sustainable shopping over fast fashion\nYou need baby gear, toys, or shoes on a budget',
    how_it_compares: 'Much more affordable than Carter\'s, OshKosh, or Abercrombie. Better curated and inspected than Facebook Marketplace or garage sales. Unlike thrift stores (Goodwill), Kid to Kid specializes in kids\' items only. The buy-back program helps offset the cost of growing kids. Best value option for children\'s clothing in the area.'
  },
  'Carters': {
    match: (name) => name.toLowerCase().includes("carter's"),
    take: 'The go-to for affordable baby and toddler basics. Known for soft fabrics, frequent sales, and complete outfit sets. Best for ages 0-5.',
    price_note: '~$5-25 per item · Frequent 50-60% off sales',
    what_to_expect: 'Retail store specializing in baby and young kids\' clothing. Known for soft cotton basics, pajamas, and bodysuits. Frequent sales and promotions (rarely pay full price). Complete outfit sets make shopping easy. Also carries shoes, accessories, and gift sets. Loyalty program offers additional discounts.',
    good_fit: 'You need basics for babies and toddlers (bodysuits, pajamas, onesies)\nYou want soft, durable fabrics at affordable prices\nYou prefer shopping during sales (and they\'re always running one)\nYour child is 0-5 years old\nYou want matching sibling outfits or gift sets',
    how_it_compares: 'Most affordable new-clothing option for babies and toddlers. Better quality basics than big-box stores. Less trendy than Abercrombie Kids but much cheaper. Adjacent to OshKosh B\'Gosh (same parent company) for older kids. The sale prices make it hard to beat for everyday basics.'
  },
  'OshKosh': {
    match: (name) => name.toLowerCase().includes('oshkosh'),
    take: 'Best for durable, play-ready clothes for active kids. Classic American style with good quality at mid-range prices. Ages 2-12.',
    price_note: '~$10-35 per item · Frequent sales',
    what_to_expect: 'Kids\' clothing store known for durable jeans, overalls, and play-ready basics. Covers ages 2-12 (picks up where Carter\'s leaves off). Frequent promotions and seasonal sales. Same parent company as Carter\'s — often located in the same shopping center. Good selection of school clothes and casual wear.',
    good_fit: 'Your child is 2-12 years old and needs durable everyday clothes\nYou want classic styles that hold up to active play\nYou shop at Carter\'s and need the next size up\nYou prefer mid-range pricing over premium brands\nYou want frequent sales and promotions',
    how_it_compares: 'Natural step up from Carter\'s for older kids (same parent company). More durable than fast-fashion brands. Less trendy and less expensive than Abercrombie Kids. Good for everyday basics and school clothes. Frequent sales make the actual prices very reasonable.'
  },
  'Abercrombie Kids': {
    match: (name) => name.toLowerCase().includes('abercrombie'),
    take: 'Best for tweens and older kids who want trendy, brand-name clothing. Premium quality and current styles. Ages 5-14.',
    price_note: '~$20-60 per item · Seasonal sales',
    what_to_expect: 'Premium kids\' clothing store with trend-forward styles. Covers ages 5-14. Known for quality denim, graphic tees, and seasonal collections. Modern, clean store environment. Online shopping with in-store pickup available. Less frequent sales than Carter\'s/OshKosh but higher quality fabrics.',
    good_fit: 'Your child is 5-14 and cares about fashion and brands\nYou want trendy styles that reflect current fashion\nYou\'re willing to pay more for quality and brand cachet\nYour tween wants to shop at a "cool" store\nYou want clothes that look good and last',
    how_it_compares: 'Most premium kids\' clothing option on this list. Better quality and more fashionable than Carter\'s/OshKosh. Much more expensive — budget accordingly. For kids who care about brands and trends. The "cool factor" matters to tweens. For basics and everyday wear, Carter\'s or OshKosh are more practical.'
  },
  'Kohls': {
    match: (name) => name.toLowerCase().includes("kohl's"),
    take: 'Best for one-stop family shopping with good selection and constant coupons. Carries multiple kids\' brands under one roof. Great sales and Kohl\'s Cash.',
    price_note: '~$8-30 per item · Kohl\'s Cash + stackable coupons',
    what_to_expect: 'Department store with large kids\' clothing section carrying Carter\'s, Nike, Under Armour, and store brands. Also has shoes, toys, and home goods. Kohl\'s Cash and frequent coupons make prices very competitive. In-store and online pickup available. Regular clearance events with deep discounts.',
    good_fit: 'You want to shop multiple brands in one trip\nYou love coupons and cashback rewards\nYou need everything from school clothes to shoes to backpacks\nYou shop sales and clearance strategically\nYou want a mix of brand-name and affordable options',
    how_it_compares: 'Best variety of any single store — carries many brands. Kohl\'s Cash makes effective prices very low. Less specialized than Carter\'s or Abercrombie but more convenient. Good for back-to-school shopping where you need everything at once. The coupon stacking strategy can yield excellent deals.'
  },

  // --- PEDIATRIC ---
  'Cook Childrens': {
    match: (name) => name.toLowerCase().includes("cook children"),
    take: 'The largest pediatric healthcare system in DFW. Best for families wanting a full-service children\'s hospital network with specialists on-site.',
    price_note: 'Insurance accepted · Copays vary by plan',
    what_to_expect: 'Full-service pediatric primary care clinics connected to the Cook Children\'s hospital network. Well-child visits, sick visits, immunizations, and specialist referrals. Same-day sick appointments often available. Patient portal for scheduling, messaging, and viewing records. Lab work and imaging available at many locations.',
    good_fit: 'You want a pediatrician backed by a major children\'s hospital\nYou value easy specialist referrals within the same network\nYou want same-day sick appointments when available\nYou prefer a large practice with multiple providers\nYou want a patient portal for records and messaging',
    how_it_compares: 'Largest pediatric network in DFW — easy specialist referrals without leaving the system. More resources than independent pediatricians. Similar to Children\'s Health in scope. The network advantage means your child\'s records follow them from primary care to specialist to hospital. Wait times can be longer than small private practices.'
  }
};

async function fetchAllBusinesses() {
  const all = [];
  let offset = null;
  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    ['name', 'category', 'take'].forEach(f => params.append('fields[]', f));
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}?${params}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const r of data.records || []) all.push({ id: r.id, ...r.fields });
    offset = data.offset || null;
  } while (offset);
  return all;
}

async function updateBatch(records) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable error: ${err}`);
  }
}

async function main() {
  console.log('Fetching businesses...');
  const businesses = await fetchAllBusinesses();
  console.log(`Total: ${businesses.length}`);

  const updates = [];

  for (const biz of businesses) {
    // Skip if already has a take (manually set)
    if (biz.take) continue;

    for (const [brandName, template] of Object.entries(BRANDS)) {
      if (template.match(biz.name)) {
        updates.push({
          id: biz.id,
          fields: {
            take: template.take,
            price_note: template.price_note,
            what_to_expect: template.what_to_expect,
            good_fit: template.good_fit,
            how_it_compares: template.how_it_compares
          }
        });
        console.log(`[${brandName}] ${biz.name}`);
        break;
      }
    }
  }

  console.log(`\nMatched ${updates.length} businesses to brand templates`);

  if (!updates.length) {
    console.log('Nothing to update.');
    return;
  }

  // Push in batches of 10
  let pushed = 0;
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    await updateBatch(batch);
    pushed += batch.length;
    console.log(`Updated ${pushed}/${updates.length}`);
    if (i + 10 < updates.length) await sleep(250);
  }

  console.log(`\nDone! ${pushed} businesses updated with brand templates.`);
  console.log('Run "npm run export" to update businesses.json.');
}

main().catch(console.error);
