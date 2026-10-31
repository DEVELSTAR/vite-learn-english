import { Lesson, User } from "../types/database"

export const MOCK_USERS: User[] = [
  {
    id: 1,
    name: "Super Admin",
    email_address: "star@gmail.com",
    role: 2, // super_admin
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Staff Admin",
    email_address: "admin@learnenglish.com",
    role: 1, // admin
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Aman Sharma",
    email_address: "aman@example.com",
    role: 0, // student
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const MOCK_LESSONS: Lesson[] = [
  {
    id: 1,
    title: "Everyday Hinglish to Fluent English",
    slug: "everyday-hinglish-to-fluent-english",
    lesson_date: new Date().toISOString().split("T")[0],
    topic: "Daily Speaking",
    introduction: "Learn how to replace common Hinglish phrases with natural, confident English expressions.",
    status: 1, // published
    lesson_type: 0, // daily_class
    position: 1,
    author_id: 1,
    content: `
<h2>How to Stop Translating Word-by-Word</h2>
<p>Most English learners in India think in Hindi/Urdu first and then translate word-by-word into English. This causes hesitation and unnatural sentences!</p>

<blockquote>
  <strong>Golden Rule:</strong> Think in concepts, not direct word-for-word translations.
</blockquote>

<h3>Common Fixes:</h3>
<ul>
  <li><strong>Don't say:</strong> <em>"What is your good name?"</em> &rarr; <strong>Say:</strong> <em>"May I know your name?"</em> or <em>"What's your name?"</em></li>
  <li><strong>Don't say:</strong> <em>"I will revert back tomorrow."</em> &rarr; <strong>Say:</strong> <em>"I will get back to you tomorrow."</em></li>
  <li><strong>Don't say:</strong> <em>"Open the fan / AC."</em> &rarr; <strong>Say:</strong> <em>"Turn on the fan / AC."</em></li>
  <li><strong>Don't say:</strong> <em>"Close the light."</em> &rarr; <strong>Say:</strong> <em>"Turn off the light."</em></li>
  <li><strong>Don't say:</strong> <em>"I gave exam yesterday."</em> &rarr; <strong>Say:</strong> <em>"I took the exam yesterday."</em> (Students 'take' tests; teachers 'give' tests!)</li>
</ul>

<h3>Daily Practice Challenge:</h3>
<p>Use at least two of these corrected phrases today when speaking to friends or colleagues. Ask your AI Tutor on the right if you are unsure of how to use them!</p>
`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Ordering Food & Coffee Naturally",
    slug: "ordering-food-and-coffee-naturally",
    lesson_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    topic: "Social Situations",
    introduction: "Polite and confident ways to place orders at cafes and restaurants without awkward pauses.",
    status: 1, // published
    lesson_type: 0, // daily_class
    position: 2,
    author_id: 1,
    content: `
<h2>Ordering with Confidence</h2>
<p>Instead of saying <em>"Give me one coffee"</em> or <em>"I want burger"</em>, polite native phrasing uses modal verbs.</p>

<h3>Key Expressions:</h3>
<ul>
  <li><em>"Could I please get an iced latte?"</em></li>
  <li><em>"I'd like a chicken sandwich, please."</em></li>
  <li><em>"Can I have the bill/check, please?"</em></li>
</ul>
`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: "English Tenses Made Simple",
    slug: "english-tenses-made-simple",
    lesson_date: new Date().toISOString().split("T")[0],
    topic: "Grammar Foundations",
    introduction: "Master the 3 core tenses that cover 85% of everyday conversations.",
    status: 1, // published
    lesson_type: 1, // foundational_topic
    position: 1,
    author_id: 1,
    content: `
<h2>The 3 Tenses You Actually Need Every Day</h2>
<p>You don't need all 12 tenses to start speaking fluently today. Focus on these 3:</p>

<ol>
  <li><strong>Simple Present:</strong> For habits and facts (<em>"I work in tech"</em>, <em>"She lives in Delhi"</em>).</li>
  <li><strong>Simple Past:</strong> For completed actions (<em>"I met him yesterday"</em>, <em>"We watched a movie"</em>).</li>
  <li><strong>Present Continuous:</strong> For actions happening right now (<em>"I am studying right now"</em>).</li>
</ol>
`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    title: "Prepositions: In, On, At Demystified",
    slug: "prepositions-in-on-at-demystified",
    lesson_date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
    topic: "Grammar Foundations",
    introduction: "Clear rules to never confuse 'in time', 'on time', 'at the airport', or 'in the bus' ever again.",
    status: 1, // published
    lesson_type: 1, // foundational_topic
    position: 2,
    author_id: 1,
    content: `
<h2>In, On, and At: The Pyramid Rule</h2>
<p>Think of prepositions of time and place as an upside-down pyramid, from general (big) to specific (small):</p>

<ul>
  <li><strong>IN (General / Biggest):</strong> In 2026, in October, in India, in the morning.</li>
  <li><strong>ON (More Specific):</strong> On Monday, on my birthday, on MG Road.</li>
  <li><strong>AT (Most Specific):</strong> At 5:00 PM, at the cafe, at home.</li>
</ul>
`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
