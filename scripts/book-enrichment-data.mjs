// Book enrichment data: characters, keywords, and descriptions for all local books.
// Keyed by normalized title (lowercase, alphanumeric only, single spaces).

export const BOOK_DATA = {
  "alice s adventures in wonderland": {
    characters: ["Alice", "White Rabbit", "Cheshire Cat", "Queen of Hearts", "Mad Hatter", "March Hare", "Caterpillar", "King of Hearts", "Duchess"],
    keywords: ["fantasy", "nonsense", "Victorian", "dream", "curiosity", "absurd", "playing cards", "tea party", "rabbit hole", "wonderland"],
    description: "A young girl named Alice falls down a rabbit hole into a fantastical underground world populated by peculiar creatures."
  },
  "anne of green gables": {
    characters: ["Anne Shirley", "Matthew Cuthbert", "Marilla Cuthbert", "Diana Barry", "Gilbert Blythe", "Rachel Lynde"],
    keywords: ["orphan", "adoption", "friendship", "imagination", "Prince Edward Island", "coming-of-age", "red hair", "kindred spirits"],
    description: "An imaginative orphan girl is mistakenly sent to a farm on Prince Edward Island, where she wins the hearts of her reluctant caretakers."
  },
  "ashputtel": {
    characters: ["Ashputtel", "Stepmother", "Stepsisters", "Prince", "Father"],
    keywords: ["Cinderella", "fairy tale", "glass slipper", "ball", "magic", "transformation", "Grimm", "stepfamily"],
    description: "A mistreated girl receives magical help to attend the royal ball, where she captures the prince's heart."
  },
  "briar rose": {
    characters: ["Briar Rose", "King", "Queen", "Wise Women", "Prince", "Wicked Fairy"],
    keywords: ["Sleeping Beauty", "fairy tale", "curse", "spindle", "100 years", "true love", "Grimm", "enchantment"],
    description: "A princess is cursed to sleep for a hundred years until awakened by true love's kiss."
  },
  "hansel gretel": {
    characters: ["Hansel", "Gretel", "Witch", "Father", "Stepmother"],
    keywords: ["fairy tale", "forest", "gingerbread house", "witch", "siblings", "Grimm", "breadcrumbs", "oven"],
    description: "Two siblings lost in the forest discover a house made of sweets, owned by a wicked witch."
  },
  "peter pan": {
    characters: ["Peter Pan", "Wendy Darling", "John Darling", "Michael Darling", "Tinker Bell", "Captain Hook", "Tiger Lily", "Lost Boys"],
    keywords: ["Neverland", "flying", "pirates", "fairies", "eternal youth", "adventure", "imagination", "second star"],
    description: "A boy who never grows up whisks the Darling children away to magical Neverland for adventure."
  },
  "rapunzel": {
    characters: ["Rapunzel", "Witch", "Prince"],
    keywords: ["fairy tale", "tower", "long hair", "Grimm", "rescue", "magic", "enchantment"],
    description: "A girl with impossibly long hair is imprisoned in a tower by a witch until a prince discovers her."
  },
  "rumpelstiltskin": {
    characters: ["Miller's Daughter", "Rumpelstiltskin", "King"],
    keywords: ["fairy tale", "spinning", "gold", "name", "bargain", "Grimm", "firstborn"],
    description: "A mysterious imp helps a girl spin straw into gold, demanding her firstborn child in return."
  },
  "the bell": {
    characters: ["Prince", "Poor Boy"],
    keywords: ["Andersen", "mystery", "forest", "sound", "nature", "spiritual"],
    description: "Two boys search for the source of a mysterious bell that rings through the forest."
  },
  "the blue fairy book": {
    characters: ["Various fairy tale characters"],
    keywords: ["anthology", "fairy tales", "Andrew Lang", "collection", "classic", "magic"],
    description: "A beloved collection of classic fairy tales gathered from around the world."
  },
  "the dream of little tuk": {
    characters: ["Little Tuk"],
    keywords: ["Andersen", "dream", "geography", "lessons", "imagination", "Denmark"],
    description: "A boy dreams his way through geography lessons in a magical nighttime adventure."
  },
  "the elderbush": {
    characters: ["Little Boy", "Old Man", "Elder-Tree Mother"],
    keywords: ["Andersen", "memories", "nature", "elderflower", "storytelling", "Denmark"],
    description: "An old man shares memories and stories with a sick boy under the elder tree."
  },
  "the emperor s new clothes": {
    characters: ["Emperor", "Swindlers", "Child", "Ministers"],
    keywords: ["Andersen", "vanity", "deception", "truth", "honesty", "invisible clothes"],
    description: "Two swindlers convince a vain emperor he's wearing magnificent clothes visible only to the wise."
  },
  "the false collar": {
    characters: ["Collar", "Garter", "Iron", "Scissors"],
    keywords: ["Andersen", "vanity", "pride", "objects", "humor", "boasting"],
    description: "A proud shirt collar boasts of his adventures and romantic conquests."
  },
  "the fir tree": {
    characters: ["Fir Tree", "Mice", "Sparrows"],
    keywords: ["Andersen", "Christmas", "contentment", "wishing", "regret", "nature"],
    description: "A fir tree wishes for grander things, never appreciating the present until it's too late."
  },
  "the fisherman his wife": {
    characters: ["Fisherman", "Wife", "Enchanted Flounder"],
    keywords: ["Grimm", "greed", "wishes", "magic fish", "contentment", "sea"],
    description: "A fisherman's wife demands ever greater wishes from an enchanted fish until her greed goes too far."
  },
  "the happy family": {
    characters: ["Snails", "Old Snail Couple"],
    keywords: ["Andersen", "contentment", "family", "burdock", "simple life", "nature"],
    description: "A family of snails lives contentedly in a burdock forest, finding happiness in simple things."
  },
  "the jungle book": {
    characters: ["Mowgli", "Baloo", "Bagheera", "Shere Khan", "Akela", "Kaa", "Raksha"],
    keywords: ["India", "jungle", "wolves", "animals", "coming-of-age", "law of the jungle", "Kipling"],
    description: "A boy raised by wolves in the Indian jungle learns the ways of the wild from animal friends."
  },
  "the leap frog": {
    characters: ["Flea", "Grasshopper", "Leap-Frog", "King", "Princess"],
    keywords: ["Andersen", "competition", "cleverness", "jumping", "humor", "marriage"],
    description: "Three creatures compete in a jumping contest for the princess's hand in marriage."
  },
  "the legend of sleepy hollow": {
    characters: ["Ichabod Crane", "Katrina Van Tassel", "Brom Bones", "Headless Horseman"],
    keywords: ["Irving", "ghost", "Headless Horseman", "Halloween", "Hudson Valley", "schoolmaster", "pumpkin"],
    description: "A superstitious schoolmaster encounters the legendary Headless Horseman in a haunted valley."
  },
  "the little match girl": {
    characters: ["Little Match Girl", "Grandmother"],
    keywords: ["Andersen", "poverty", "cold", "New Year's Eve", "visions", "tragedy", "matches"],
    description: "A poor girl lights matches on a freezing night, each flame bringing beautiful visions."
  },
  "the naughty boy": {
    characters: ["Old Poet", "Cupid"],
    keywords: ["Andersen", "Cupid", "love", "arrow", "mischief", "heart"],
    description: "A mischievous boy with a bow and arrow visits an old poet on a stormy night."
  },
  "the old house": {
    characters: ["Little Boy", "Old Man", "Tin Soldier"],
    keywords: ["Andersen", "loneliness", "friendship", "memories", "antiques", "kindness"],
    description: "A boy befriends an elderly neighbor in a crumbling old house full of memories."
  },
  "the real princess": {
    characters: ["Princess", "Prince", "Queen"],
    keywords: ["Andersen", "Princess and the Pea", "sensitivity", "test", "royalty", "mattresses"],
    description: "A queen devises a test with a pea under many mattresses to prove a girl is a true princess."
  },
  "the red shoes": {
    characters: ["Karen", "Old Lady", "Angel"],
    keywords: ["Andersen", "vanity", "dancing", "punishment", "redemption", "red shoes"],
    description: "A vain girl becomes cursed to dance forever in her magical red shoes."
  },
  "the secret garden": {
    characters: ["Mary Lennox", "Colin Craven", "Dickon", "Ben Weatherstaff", "Martha", "Archibald Craven"],
    keywords: ["garden", "healing", "friendship", "Yorkshire", "orphan", "nature", "transformation", "manor"],
    description: "An orphaned girl discovers a hidden garden that transforms her and those around her."
  },
  "the shadow": {
    characters: ["Learned Man", "Shadow"],
    keywords: ["Andersen", "doppelganger", "identity", "darkness", "philosophy", "tragic"],
    description: "A man's shadow takes on a life of its own with sinister consequences."
  },
  "the shoes of fortune": {
    characters: ["Councillor", "Watchman", "Clerk", "Student"],
    keywords: ["Andersen", "magic shoes", "wishes", "transformation", "Copenhagen", "fantasy"],
    description: "Magical galoshes grant wishes to various people, often with unexpected results."
  },
  "the snow queen": {
    characters: ["Gerda", "Kay", "Snow Queen", "Robber Girl", "Grandmother"],
    keywords: ["Andersen", "ice", "winter", "love", "friendship", "mirror", "trolls", "journey"],
    description: "A brave girl journeys to the Snow Queen's palace to rescue her friend from an icy curse."
  },
  "the story of a mother": {
    characters: ["Mother", "Death", "Night", "Thorn Bush", "Lake"],
    keywords: ["Andersen", "grief", "sacrifice", "motherhood", "death", "tragedy"],
    description: "A mother makes desperate bargains to find Death and reclaim her child."
  },
  "the swineherd": {
    characters: ["Prince", "Princess", "Emperor"],
    keywords: ["Andersen", "disguise", "pride", "kisses", "lesson", "pig"],
    description: "A prince disguises himself as a swineherd to win a vain princess's affection."
  },
  "the twelve dancing princesses": {
    characters: ["Twelve Princesses", "Soldier", "King", "Old Woman"],
    keywords: ["Grimm", "dancing", "secret", "underground", "enchantment", "mystery", "shoes"],
    description: "A soldier uncovers the mystery of twelve princesses who wear out their shoes dancing each night."
  },
  "the wonderful wizard of oz": {
    characters: ["Dorothy", "Toto", "Scarecrow", "Tin Woodman", "Cowardly Lion", "Wizard of Oz", "Wicked Witch", "Glinda"],
    keywords: ["Kansas", "tornado", "yellow brick road", "Emerald City", "magic", "home", "ruby slippers", "Baum"],
    description: "A Kansas girl and her dog are swept by tornado to a magical land where they seek a wizard's help to return home."
  },
  "tom sawyer": {
    characters: ["Tom Sawyer", "Huckleberry Finn", "Becky Thatcher", "Aunt Polly", "Injun Joe", "Joe Harper"],
    keywords: ["Mississippi", "adventure", "boyhood", "mischief", "Twain", "fence painting", "treasure", "cave"],
    description: "A mischievous boy has adventures along the Mississippi River with his friends."
  },
  "tom thumb": {
    characters: ["Tom Thumb", "Parents", "King", "Giant"],
    keywords: ["Grimm", "tiny", "adventure", "clever", "fairy tale", "size"],
    description: "A boy no bigger than a thumb uses his wits to survive extraordinary adventures."
  },
  "treasure island": {
    characters: ["Jim Hawkins", "Long John Silver", "Captain Smollett", "Dr. Livesey", "Squire Trelawney", "Ben Gunn", "Billy Bones"],
    keywords: ["pirates", "treasure", "map", "Stevenson", "sea", "adventure", "parrot", "mutiny"],
    description: "A young boy finds a treasure map and sets sail on a dangerous voyage with pirates."
  }
};

export function normalizeKey(input) {
  return String(input || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getBookData(folderName) {
  const key = normalizeKey(folderName);
  return BOOK_DATA[key] || null;
}
