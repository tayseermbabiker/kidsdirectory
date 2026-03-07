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
