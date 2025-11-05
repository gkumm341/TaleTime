export interface Story {
  id: string;
  title: string;
  genre: string;
  age: string;
  time: number; // in minutes
  teaser: string;
  content: string;
  author: string;
  mood: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  dateAdded: string;
  featured?: boolean;
}

export const stories: Story[] = [
  {
    id: '1',
    title: 'The Midnight Forest',
    genre: 'Fantasy',
    age: 'Teens',
    time: 10,
    teaser: 'A young traveler uncovers a glowing secret deep in the woods.',
    content: `The moon hung low in the star-scattered sky as Maya ventured deeper into the Whispering Woods. Each step forward seemed to echo with ancient secrets, and the trees themselves appeared to lean in, as if listening to her thoughts.

She had been walking for what felt like hours when she first noticed the glow. At first, she thought it might be another traveler's lantern, but the light was too ethereal, too blue-green to be fire. It pulsed gently, like a heartbeat made of starlight.

Following the mysterious illumination, Maya pushed through a curtain of silver willow branches and gasped. Before her lay a clearing she had never seen before, despite having explored these woods since childhood. In the center stood a circle of ancient stones, each one carved with symbols that seemed to shift and dance in the strange light.

The glow emanated from a pool of water at the circle's heart. As Maya approached, she saw that the water itself was luminous, as if liquid moonbeams had been captured and contained within the stone basin.

"Beautiful, isn't it?" came a voice from behind her.

Maya spun around to find an elderly woman stepping out from behind one of the stones. She wore robes that seemed to be woven from the night sky itself, complete with twinkling stars.

"Who are you?" Maya whispered.

"I am the Guardian of the Moonwell," the woman replied with a warm smile. "I have been waiting for you, Maya."

"Waiting for me? But how do you know my name?"

The Guardian gestured toward the glowing pool. "The Moonwell shows me many things. It has been calling to you for weeks now, hasn't it? The dreams of blue light, the feeling that something was drawing you deeper into the forest?"

Maya's eyes widened. It was true – she had been having strange dreams, and tonight she had felt an irresistible pull to walk deeper into the woods than ever before.

"What does it want with me?" she asked.

"Not what it wants," the Guardian corrected gently, "but what you need. You have been searching for your purpose, haven't you? Feeling lost between childhood and adulthood, uncertain of your path?"

Maya nodded, surprised by how accurately this stranger seemed to understand her feelings.

"The Moonwell is a place of clarity," the Guardian explained. "Those who are meant to find it are granted a vision of their true calling. But the gift comes with responsibility – you must use what you learn to help others find their way."

With trembling hands, Maya approached the luminous pool. The Guardian nodded encouragingly. "Simply look into the water and ask your heart what you truly wish to know."

As Maya peered into the swirling depths, the blue-green light intensified. Images began to form in the water – herself as a teacher, surrounded by eager young faces; herself writing stories by candlelight; herself planting gardens that fed entire communities.

"I see... I see myself helping others," she whispered in wonder.

"And so you shall," the Guardian said. "The forest has chosen you as its new storyteller. You will carry tales of wonder back to your village, reminding people of the magic that still exists in the world."

As the vision faded, Maya felt a profound sense of peace settle over her. She finally understood her purpose.

"Will I see you again?" she asked as she prepared to leave.

The Guardian smiled mysteriously. "The forest keeps its secrets, child. But remember – magic is never truly gone. It simply waits for those brave enough to seek it."

As Maya made her way home through the moonlit trees, she carried with her not just a magical experience, but a new understanding of her place in the world. Behind her, the Moonwell's glow gradually dimmed until it became just another shadow in the Whispering Woods – waiting for the next lost soul to find their way.`,
    author: 'Sarah Chen',
    mood: 'Mystical',
    difficulty: 'Medium',
    tags: ['magic', 'coming-of-age', 'nature', 'self-discovery'],
    dateAdded: '2024-11-01',
    featured: true
  },
  {
    id: '2',
    title: 'Cup of Courage',
    genre: 'Inspiration',
    age: 'Adults',
    time: 5,
    teaser: 'A quick tale about bravery found in unexpected places.',
    content: `Maria stared at the email on her phone screen for the third time that morning. The words "interview scheduled for 2 PM today" seemed to blur together as her coffee grew cold in her hands.

At 45, she hadn't been on a job interview in over twenty years. The marketing agency she'd worked at had downsized, and suddenly she found herself competing with people half her age for positions she used to take for granted.

"You're being ridiculous," she muttered to herself, but her hands still shook as she lifted the coffee cup to her lips.

"Excuse me, miss?" 

Maria looked up to see an elderly man at the next table, his own coffee steaming in the morning air of the outdoor café.

"I couldn't help but notice you seem nervous about something. Are you okay?"

Normally, Maria would have politely deflected, but something about the man's kind eyes made her pause. "Job interview," she said simply. "First one in twenty years."

The man nodded knowingly. "Ah, those can be terrifying. May I share something with you?"

Maria gestured to the empty chair across from her, and the man moved over with his coffee.

"I'm 78 years old," he began, "and I started my first business when I was 50. Everyone told me I was too old, too set in my ways. But you know what I discovered?"

"What's that?"

"The secret ingredient isn't youth or fearlessness. It's showing up anyway, even when you're scared. Especially when you're scared."

He took a sip of his coffee and smiled. "Fear means you care. It means the opportunity matters to you. The young folks? They're not brave because they're not afraid. You? You're brave because you are afraid and you're doing it anyway."

Maria felt something shift inside her chest. "I hadn't thought of it that way."

"Your experience, your wisdom, your perspective – those are superpowers, not liabilities. That company would be lucky to have someone who's lived enough to know what really matters."

The man finished his coffee and stood up. "Now, I have a feeling you need to go prepare for that interview. Show them what decades of experience looks like when it walks into a room."

As he walked away, Maria realized she was sitting up straighter. The email on her phone no longer looked intimidating – it looked like an opportunity.

She finished her coffee, gathered her things, and headed home to prepare. For the first time in months, she felt ready for whatever came next.

Later that afternoon, as she walked out of the interview with a job offer in hand, Maria smiled, remembering the stranger's words. Sometimes courage comes not from the absence of fear, but from a simple reminder that our fear means we're alive, we're growing, and we're exactly where we need to be.`,
    author: 'Michael Rodriguez',
    mood: 'Uplifting',
    difficulty: 'Easy',
    tags: ['courage', 'career', 'wisdom', 'age', 'confidence'],
    dateAdded: '2024-11-02'
  },
  {
    id: '3',
    title: 'Moonlight Parade',
    genre: 'Adventure',
    age: 'Kids',
    time: 15,
    teaser: 'Animals gather for a secret midnight celebration.',
    content: `Every night, after the last porch light dimmed and the final car engine fell silent, something magical happened in Willowbrook Park. But only Luna the cat knew about it, and she was excellent at keeping secrets.

Tonight was special, though. Tonight, Luna had decided to invite someone new to the Moonlight Parade.

She padded quietly across the dewy grass to where eight-year-old Sam was camping in his backyard. His parents had finally agreed to let him sleep outside in his tent, and Luna knew this was her chance.

"Psst," she whispered through the tent wall. "Sam, are you awake?"

Sam's eyes popped open. Did his cat just... talk to him? He unzipped the tent flap and peered out. Luna sat primly in the moonlight, her green eyes twinkling.

"Luna? Did you just speak to me?"

"Of course I did, silly. Animals can always talk – humans just forget how to listen. But on nights when the moon is perfectly round like tonight, the magic is strong enough for everyone to understand."

Sam crawled out of his tent, rubbing his eyes. "This has to be a dream."

"If it is, it's the best kind," Luna purred. "Come on, we're going to be late for the parade!"

She bounded toward the park, and Sam, still convinced he was dreaming, followed in his pajamas and bare feet.

As they reached the edge of the park, Sam gasped. Animals were emerging from everywhere – raccoons from the storm drains, squirrels from the oak trees, rabbits from their burrows, and even a family of deer stepping delicately from the woods.

"Welcome to the Moonlight Parade!" announced Oliver the wise old owl, perched on the park's central fountain. "Tonight we celebrate the full moon and all the wonders it brings to our world."

The animals began to line up in the most unusual parade Sam had ever seen. The deer led the way, their antlers adorned with fireflies that blinked like tiny lanterns. Behind them, the raccoons had organized themselves into a marching band, using acorn caps as drums and hollow reeds as flutes.

The squirrels performed acrobatic tricks, leaping from tree to tree above the parade route, while the rabbits hopped in perfect synchronized patterns below. Even the usually grumpy neighborhood tomcat, Mr. Whiskers, was there, wearing a crown made of dandelions and looking surprisingly regal.

"This happens every full moon?" Sam whispered to Luna as they joined the procession.

"Every single one," she confirmed. "We celebrate the magic that connects all living things. The moon reminds us that we're all part of something bigger and more wonderful than we usually remember."

As the parade wound through the park, something extraordinary happened. The flowers seemed to glow brighter in the moonlight, the grass felt softer under Sam's feet, and he could swear he heard the trees whispering encouragement as they passed.

The parade ended at the park's small pond, where the moon's reflection created a perfect silver circle on the water's surface. All the animals gathered around as Oliver the owl spoke again.

"Tonight, we welcome a new friend to our circle," he said, nodding toward Sam. "Sam has been chosen to witness our celebration because he has something special – a heart that still believes in magic."

One by one, each animal stepped forward and shared what they were grateful for. The deer were thankful for the sweet clover in the meadow. The squirrels appreciated the abundance of acorns. The rabbits were grateful for the warm burrows that kept their families safe.

When it was Sam's turn, he thought for a moment. "I'm grateful for friends like Luna who share their secrets with me, and for nights like this that remind me how amazing the world really is."

As dawn began to creep across the sky, the animals started to disperse, each returning to their daily hiding places. Luna rubbed against Sam's legs affectionately.

"Will you remember this when you wake up?" she asked.

Sam knelt down and scratched behind her ears. "I don't think I could ever forget something this wonderful. But Luna?"

"Yes?"

"When's the next full moon?"

Luna's purr was so loud it seemed to echo across the entire park. "In exactly 28 days. And Sam? You're officially invited to every Moonlight Parade from now on."

As Sam crawled back into his tent, he looked up at the fading moon and smiled. Whether it was a dream or real magic, he knew he would never look at his backyard – or his cat – the same way again.

And every month, when the moon grew full and round, Sam would slip out of his tent and join his animal friends for their secret celebration, keeping the magic alive in his heart and carrying it with him into each new day.`,
    author: 'Emma Thompson',
    mood: 'Whimsical',
    difficulty: 'Easy',
    tags: ['animals', 'magic', 'friendship', 'wonder', 'childhood'],
    dateAdded: '2024-11-03',
    featured: true
  },
  {
    id: '4',
    title: 'The Last Library',
    genre: 'Mystery',
    age: 'Adults',
    time: 25,
    teaser: 'A librarian discovers books that write themselves in an abandoned library.',
    content: `The advertisement in the newspaper was simple: "Librarian needed for private collection. Night shift. Excellent compensation. Discretion required." 

Eleanor had been unemployed for three months since the city library closed, so she didn't hesitate to call the number. The interview was brief – just a few questions about her experience and an unusual emphasis on her ability to "work independently without asking too many questions."

The library was located in the old Blackwood mansion on the outskirts of town. Eleanor had driven past it countless times, always wondering about the dark windows and overgrown gardens. She never imagined she'd be unlocking its heavy oak doors with an ornate brass key.

Inside, her breath caught. The library was magnificent – three stories of floor-to-ceiling bookshelves connected by a spiraling staircase, with reading nooks tucked into every corner. Moonlight streamed through tall windows, casting everything in an ethereal silver glow.

Her employer, Mr. Blackwood, was a thin, pale man who seemed to blend into the shadows. He showed her around quickly, pointing out the card catalog system (surprisingly modern despite the mansion's age) and explaining her duties: maintain the collection, assist any patrons who might visit, and most importantly, document any... irregularities.

"Irregularities?" Eleanor had asked.

"You'll understand soon enough," he replied cryptically. "Just keep detailed notes of anything unusual. I review them each morning."

For the first week, Eleanor's job was wonderfully peaceful. She organized shelves, updated the catalog, and enjoyed the profound silence of the empty mansion. No patrons visited, which seemed odd for such an impressive collection, but she didn't mind the solitude.

It was on her eighth night that she first noticed something strange.

She was shelving returns (though she'd never seen anyone check books out) when she spotted a book that hadn't been there before: "The Chronicles of Eleanor Hartwell." Her own name was embossed in gold on the leather spine.

With trembling hands, she pulled it from the shelf and opened to the first page:

"Eleanor stared at the book in her hands, unable to believe what she was seeing. Her entire life was written out in careful script – her childhood in Maine, her library science degree, even her recent job loss. But as she read further, the text began describing events she didn't remember..."

Heart pounding, Eleanor read about herself discovering the book, reading about herself discovering the book. It was like looking into an infinite mirror. But then the text diverged from reality:

"Eleanor would soon realize that the Blackwood Library existed between worlds. Every book that had ever been written, would be written, or could be written existed somewhere in its endless stacks. And some books... wrote themselves."

She slammed the book shut and shoved it back onto the shelf. But when she turned around, dozens of other books had appeared: "The Life of Eleanor Hartwell, Volume 2," "Eleanor's Discoveries," "The Librarian Who Knew Too Much."

Over the following nights, Eleanor became obsessed with the self-writing books. Each one revealed more about the library's true nature. She learned that the mansion existed in a pocket dimension where all possible stories converged. Authors throughout history hadn't created their works – they had simply accessed what already existed here.

The books about her own life kept multiplying, showing different versions of her story. In some, she became the mansion's permanent guardian. In others, she fled in terror. One particularly unsettling volume described her slowly forgetting the outside world existed at all.

She tried to leave several times, but the heavy oak doors wouldn't budge. The windows, which had seemed so clear from inside, were painted black from the outside. Her phone had no signal, and the landline she'd noticed on her first night had vanished entirely.

Mr. Blackwood's morning notes became her only connection to reality:

"Excellent work documenting the temporal books, Eleanor. Have you begun reading the prophecy volumes yet?"

"The books about yourself are particularly active. This is normal during the adjustment period."

"Please remember that the library chooses its librarians carefully. Fighting your destiny only makes the transition more difficult."

Eleanor realized she was trapped in a story that was still being written. Every choice she made, every thought she had, appeared in new books that materialized on the shelves. She was becoming both the reader and the protagonist of her own infinite tale.

On her twentieth night, she made a decision. If the library contained every possible story, it had to contain stories where she escaped. She began searching frantically through the stacks, looking for books titled "How Eleanor Escaped the Blackwood Library" or "The Librarian's Freedom."

She found them, dozens of them, each describing different escape methods. But as she tried to follow their instructions, she realized the horrible truth: the books were writing themselves based on her thoughts. She wasn't finding solutions – she was creating fictional ones that could never actually work.

The library had trapped her in a loop of infinite possibility where every hope of escape became just another story on its endless shelves.

As dawn broke over the mansion, Eleanor sat in the center of the main reading room, surrounded by books that chronicled every version of her life. She understood now why Mr. Blackwood had emphasized discretion in the job posting. 

The last thing she wrote in her logbook was: "Day 20. I understand the collection now. The library doesn't just contain every story – it creates them. And I'm not the librarian here. I'm just another book waiting to be read."

When Mr. Blackwood arrived that morning, he found the logbook on the desk and Eleanor nowhere to be seen. But a new section had appeared in the card catalog: "The Eleanor Collection" – thousands of volumes chronicling every possible life she might have lived.

And somewhere in those endless stacks, a new book was already writing itself: "The Life of the Next Librarian."

The newspaper advertisement ran again the following week, exactly as before.`,
    author: 'David Thornton',
    mood: 'Eerie',
    difficulty: 'Hard',
    tags: ['mystery', 'supernatural', 'books', 'reality', 'meta-fiction'],
    dateAdded: '2024-10-28'
  },
  {
    id: '5',
    title: 'Paper Airplane Dreams',
    genre: 'Inspiration',
    age: 'Kids',
    time: 8,
    teaser: 'A child learns that big dreams can start with small steps.',
    content: `Jamie sat at her desk, staring out the classroom window at the planes flying high above the school. She had drawn hundreds of airplanes in her notebooks, built model planes from kits, and could name every type of aircraft she saw in the sky. More than anything, Jamie wanted to be a pilot.

But every time she mentioned her dream, the adults in her life seemed to find reasons why it was impossible. "Flying is very expensive, dear," her grandmother would say. "Maybe you should think about something more... practical," suggested her career counselor.

Today was different, though. Today, their teacher, Ms. Rodriguez, had announced a special project.

"We're going to have a paper airplane contest," Ms. Rodriguez explained, holding up a sheet of regular notebook paper. "But this isn't just about whose plane flies the farthest. I want you to research a real airplane and design your paper version to match it. Then you'll present your plane and tell us why you chose that particular aircraft."

Jamie's heart leaped. Finally, a chance to share her passion with the whole class!

That afternoon, Jamie walked home with her best friend Marcus, already planning her project.

"I'm going to make a fighter jet," Marcus announced. "Something super fast and cool."

"I'm thinking about the Wright Flyer," Jamie said thoughtfully. "You know, the first airplane that actually flew. It changed everything."

Marcus looked at her curiously. "Why not something modern and exciting?"

Jamie considered this as they reached her house. Why was she drawn to that old biplane from 1903? As she settled down to research, she began to understand.

Orville and Wilbur Wright had been told their dreams were impossible too. People said humans weren't meant to fly. Scientists proved mathematically that powered flight was a fantasy. But the Wright brothers didn't listen. They started small – with kites, then gliders, then finally their powered Flyer.

Jamie spent hours perfecting her paper airplane. She folded and refolded, adjusting the wings to match the Wright Flyer's design. Her first attempts crashed immediately. Her fifth attempt flew for two seconds. By her twentieth try, she had a plane that glided smoothly across her room.

The day of the contest, Jamie watched her classmates launch their creations. Marcus's fighter jet looked impressive but nose-dived after three feet. Sarah's commercial airliner was beautifully decorated but wouldn't fly straight. 

When Jamie's turn came, she stood in front of the class holding her simple, brown paper biplane.

"This is the Wright Flyer," she began, her voice stronger than she'd expected. "On December 17, 1903, it flew for 12 seconds and traveled 120 feet. That doesn't sound like much, but it was the first time in human history that a powered aircraft carried a person through the air."

She launched her plane. It wasn't the fastest or the prettiest, but it flew steadily and straight, landing gently at the back of the classroom.

"The Wright brothers started with a dream that everyone said was impossible," Jamie continued as she retrieved her plane. "They didn't have fancy equipment or lots of money. They had bicycles and curiosity and the belief that if they kept trying, they could figure it out."

She looked around the room, seeing her classmates' faces in a new way – not as an audience to impress, but as fellow dreamers.

"I want to be a pilot someday," she said simply. "People tell me it's hard, that I should choose something easier. But the Wright brothers taught me that every big achievement starts with someone willing to try something that seems impossible."

The room was quiet for a moment. Then Marcus started clapping, and soon the whole class joined in.

Ms. Rodriguez smiled as she announced the winners. Marcus won for creativity, Sarah for artistic design, and Jamie won for best flight and most inspiring presentation.

But the real prize came after class, when three other students approached Jamie.

"I want to be an astronaut," whispered Alex, "but my parents think I should be more realistic."

"I dream about designing video games," added Keisha, "but everyone says that's just playing around."

"Maybe we could start a dream club," suggested Tommy, who wanted to be a marine biologist. "You know, support each other and figure out the small steps we can take now."

As Jamie walked home that day, her paper Wright Flyer tucked carefully in her backpack, she realized something important. The plane itself wasn't magic – it was just folded paper. But the dream it represented, and the courage to share that dream with others, that was powerful enough to lift not just paper airplanes, but spirits and possibilities.

That night, she started a new notebook. On the first page, she wrote: "Flight Plan to My Dreams - Step 1: Paper airplanes. Step 2: Model building. Step 3: Science and math excellence. Step 4: Flight lessons. Step 5: Pilot's license. Step 6: The sky."

Below that, she drew a small paper airplane with a long, graceful flight path stretching across the page and onto the next, ready for whatever adventures lay ahead.

Sometimes the biggest journeys really do begin with the smallest steps – even if that step is just folding a piece of paper and believing it can fly.`,
    author: 'Lisa Park',
    mood: 'Hopeful',
    difficulty: 'Easy',
    tags: ['dreams', 'perseverance', 'aviation', 'school', 'inspiration'],
    dateAdded: '2024-11-04'
  },
  {
    id: '6',
    title: 'The Time Gardener',
    genre: 'Fantasy',
    age: 'Adults',
    time: 18,
    teaser: 'An elderly woman discovers she can grow moments from her past in her garden.',
    content: `Meredith had always been good with plants, but it wasn't until her 75th birthday that she discovered she could grow memories.

It started innocently enough. While planting her usual spring garden, she found herself thinking intensely about her late husband Robert and their first dance at their wedding 50 years ago. As she pressed the tomato seeds into the dark soil, she whispered, "I wish I could see that moment just once more."

Three weeks later, when the first green shoots appeared, something extraordinary happened. As Meredith touched the tender leaves, the garden around her shimmered and shifted. Suddenly, she was 25 again, wearing her white wedding dress, spinning in Robert's arms as "The Way You Look Tonight" played on a scratchy radio.

The vision lasted only seconds, but it was completely real – she could smell Robert's aftershave, feel the rough texture of his rented tuxedo, hear his nervous laughter as he stepped on her dress.

When the memory faded, Meredith was back in her garden, kneeling beside the tomato seedlings, tears streaming down her weathered cheeks.

That night, she could barely sleep. Had she imagined it? Was her aging mind playing tricks on her? But deep down, she knew what she had experienced was real.

The next morning, she tried again. This time, she planted marigold seeds while focusing intensely on her daughter's first steps. Two weeks later, touching the golden blooms transported her back to their old kitchen, where baby Sarah tottered across the linoleum floor into her waiting arms.

Word by word, memory by memory, Meredith began to understand the rules of her strange new gift. The stronger the emotion attached to a memory, the more vivid the recreation. Happy memories grew in bright flowers – sunflowers for her children's laughter, roses for romantic moments, daisies for simple joys. Sad memories took root in herbs and vegetables – the bitter parsley that held her mother's funeral, the onions that made her cry as she relived her divorce.

She could only visit each memory once per plant. When the growing season ended, the memories faded with the flowers. And she had to be careful – some memories were too painful to revisit, no matter how much she missed the people in them.

Her neighbor, Mrs. Chen, noticed the change in Meredith's garden. It had always been beautiful, but now it seemed to pulse with an almost supernatural vitality. The flowers bloomed longer and brighter than anything in the neighborhood.

"Your garden is incredible this year," Mrs. Chen mentioned over the fence one morning. "What's your secret?"

Meredith almost told her the truth. The loneliness of keeping such a wonder to herself was overwhelming. But how could she explain that she was growing her past alongside her petunias?

Instead, she simply smiled and said, "Love. I put a lot of love into each plant."

It was true, in its way.

As summer progressed, Meredith became more adventurous with her memory garden. She planted a section dedicated to her childhood – bachelor buttons for summer afternoons at her grandmother's farm, snapdragons for the puppet shows she used to stage for her siblings, morning glories for the dreams she'd had as a young girl.

But it was the grief garden that taught her the most profound lessons. She had avoided planting memories of Robert's illness for months, but finally, she knew she needed to face them. She chose forget-me-nots, their tiny blue faces seeming appropriate for memories she had tried so hard to, well, forget.

When she touched the first bloom, she was transported back to Robert's hospital room during his final days. She expected the memory to be devastating, as it had been when she lived through it the first time. But something had changed in her perspective over the years.

This time, instead of focusing on the machines and the fear, she saw Robert's eyes light up when she read him poetry. She noticed how tightly he squeezed her hand, how he smiled when she told him silly stories about the neighbors. She realized that even in those dark days, there had been profound love and connection.

The memory-flowers began to teach her things about her own life that she had never understood. A patch of lavender showed her a fight she'd had with her teenage daughter, but from this new vantage point, she could see Sarah's tears and recognize the fear behind the anger. Sweet peas revealed moments of quiet contentment she had overlooked while they were happening – reading books on Sunday mornings, humming while folding laundry, watching Robert build birdhouses in the garage.

As autumn approached, Meredith faced a difficult decision. Should she try to preserve the memory plants through the winter? She had researched techniques for keeping flowers alive in greenhouses, but something told her this would be wrong.

The memories were meant to be seasonal, like everything in nature. Holding onto them too tightly would be like trying to keep summer from turning to fall.

On the last warm day of September, Meredith walked through her memory garden one final time. She touched each plant gently, not to relive the memories, but to thank them for the lessons they had taught her.

Then she did something that surprised even herself. She gathered seeds from every plant – not to grow the same memories again, but to plant new ones. She had realized that while the past was beautiful, she was still making memories every day.

That winter, as snow covered her dormant garden, Meredith began keeping a journal of small daily moments – the way the morning light hit her coffee cup, the sound of children playing in the distance, the feeling of her cat purring on her lap. These would be the seeds for next year's garden.

When spring arrived, Meredith planted both old memories and new ones. But she also did something different – she invited Mrs. Chen to help her plant a friendship garden, full of the moments they had shared over the fence.

As they worked together in the soil, Meredith realized that the most magical thing about memories wasn't that they could be preserved and revisited, but that they could be shared. The garden had taught her that the past was not something to live in, but something to learn from and carry forward.

And perhaps most importantly, she had learned that every day was an opportunity to plant seeds for memories that would bloom in seasons yet to come.

That evening, as she watered the newly planted garden, Meredith whispered to the seeds: "Grow well, little memories. Teach me something beautiful."

The soil seemed to shimmer with possibility in the fading light, ready to transform simple seeds into moments of wonder, one season at a time.`,
    author: 'Robert Chen',
    mood: 'Bittersweet',
    difficulty: 'Medium',
    tags: ['memory', 'aging', 'loss', 'gardening', 'wisdom'],
    dateAdded: '2024-10-30'
  }
];

export const genres = ['Fantasy', 'Adventure', 'Inspiration', 'Mystery', 'Romance', 'Comedy', 'Drama'];
export const ageGroups = ['Kids', 'Teens', 'Adults'];
export const moods = ['Whimsical', 'Mystical', 'Uplifting', 'Eerie', 'Hopeful', 'Bittersweet', 'Adventurous'];
export const difficulties = ['Easy', 'Medium', 'Hard'];

// Utility functions
export const getStoriesByGenre = (genre: string) => 
  genre === 'any' ? stories : stories.filter(story => story.genre === genre);

export const getStoriesByAge = (age: string) => 
  age === 'any' ? stories : stories.filter(story => story.age === age);

export const getStoriesByTime = (maxTime: number) => 
  stories.filter(story => story.time <= maxTime);

export const getFeaturedStories = () => 
  stories.filter(story => story.featured);

export const filterStories = (filters: {
  genre?: string;
  age?: string;
  maxTime?: number;
  mood?: string;
  difficulty?: string;
  tags?: string[];
}) => {
  return stories.filter(story => {
    if (filters.genre && filters.genre !== 'any' && story.genre !== filters.genre) return false;
    if (filters.age && filters.age !== 'any' && story.age !== filters.age) return false;
    if (filters.maxTime && story.time > filters.maxTime) return false;
    if (filters.mood && story.mood !== filters.mood) return false;
    if (filters.difficulty && story.difficulty !== filters.difficulty) return false;
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => 
        story.tags.some(storyTag => 
          storyTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasMatchingTag) return false;
    }
    return true;
  });
};

export const getStoryById = (id: string) => 
  stories.find(story => story.id === id);

export const searchStories = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return stories.filter(story => 
    story.title.toLowerCase().includes(lowerQuery) ||
    story.teaser.toLowerCase().includes(lowerQuery) ||
    story.author.toLowerCase().includes(lowerQuery) ||
    story.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};