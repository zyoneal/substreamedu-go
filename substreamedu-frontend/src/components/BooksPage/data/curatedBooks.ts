import { Book } from '../types/book.types';

export const CURATED_BOOKS: Book[] = [
    // ==========================================
    // A1 - BEGINNER
    // ==========================================
    {
        id: 'curated-the-little-prince',
        title: 'The Little Prince',
        author: 'Antoine de Saint-Exupéry',
        level: 'A1',
        description: 'A gentle and poetic story about an aviator stranded in the Sahara desert and a young boy who fell from a distant asteroid.',
        coverGradient: 'linear-gradient(135deg, #134e4a 0%, #064e3b 100%)',
        accentColor: '#14b8a6',
        totalWords: 1450,
        estimatedMinutes: 8,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: The Sahara Desert',
                wordCount: 480,
                content: `Six years ago, my aeroplane broke down in the Sahara desert. Something was broken in my engine. I was alone, with water for only eight days.
On the first night, I went to sleep on the sand, a thousand miles from any human house. I was more isolated than a sailor on a raft in the middle of the ocean.
Imagine my surprise when, at sunrise, a gentle voice woke me up.
"Please... draw me a sheep!"
I jumped up as if struck by lightning. I rubbed my eyes. I looked carefully. And I saw a most extraordinary little boy, who stood there looking at me with great seriousness.
"Draw me a sheep," he repeated softly.
When a mystery is too great, one does not dare to disobey. Absurd as it seemed, a thousand miles from any living person, I took out a piece of paper and my fountain pen.
"I do not know how to draw sheep," I answered.
"That doesn't matter. Draw me a sheep!" he said.`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: The Rose on the Asteroid',
                wordCount: 470,
                content: `I soon learned to know this flower much better. On the little prince's planet, there had always been very simple flowers, with only one circle of petals. They took up no room and bothered nobody.
One morning, however, a new seed had sprouted from somewhere. The little prince had watched this sprout very carefully. It could have been a new kind of baobab tree.
The shrub stopped growing and began to prepare a blossom. The little prince, who observed the growth of an enormous bud, felt that something miraculous would emerge.
Then one morning, exactly at sunrise, the rose revealed herself!
"Ah! I am scarcely awake," said the rose, yawning. "I beg your pardon... my petals are still in disorder."
The little prince could not contain his admiration.
"How lovely you are!" he whispered.
"Am I not?" the flower responded sweetly. "And I was born at the very same moment as the sun."
The little prince realized she was not very modest, but she was wonderfully enchanting.`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: The Secret of the Fox',
                wordCount: 500,
                content: `It was then that the fox appeared.
"Good morning," said the fox.
"Good morning," the little prince replied politely, though when he turned around he saw nothing.
"I am right here," said the voice, "under the apple tree."
"Who are you?" asked the little prince. "You are very pretty to look at."
"I am a fox," said the animal.
"Come and play with me," the little prince proposed. "I am so unhappy today."
"I cannot play with you," the fox said. "I am not tamed."
"What does that mean — tamed?" asked the boy.
"It is an act too often forgotten," said the fox. "It means to establish ties."
"To establish ties?"
"Just that," said the fox. "To me, you are still nothing more than a little boy who is like a hundred thousand other little boys. And I have no need of you. And you, on your part, have no need of me. To you I am nothing more than a fox like a hundred thousand other foxes. But if you tame me, then we shall need each other. To me, you will be unique in all the world. To you, I shall be unique in all the world."
"I am beginning to understand," said the little prince.`
            }
        ]
    },
    {
        id: 'curated-aesops-fables',
        title: "Aesop's Classic Fables",
        author: 'Aesop',
        level: 'A1',
        description: 'Timeless moral tales featuring clever animals, wisdom, and easy-to-read vocabulary for beginner English learners.',
        coverGradient: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
        accentColor: '#3b82f6',
        totalWords: 1220,
        estimatedMinutes: 7,
        chapters: [
            {
                id: 'ch-1',
                title: 'The Tortoise and the Hare',
                wordCount: 390,
                content: `A Hare was once boasting about his great speed before the other animals.
"I have never yet been beaten in a foot race," said he proudly. "I challenge anyone here to race with me!"
The Tortoise replied quietly, "I accept your challenge."
"That is a good joke!" laughed the Hare. "I could dance around you all the way to the finish line!"
"Keep your boasting until you win," answered the Tortoise. "Shall we begin?"
A course was chosen and a starting post was fixed. The race began.
The Hare darted almost out of sight at once. Soon, feeling confident and playful, he decided to stop and take a short nap in the warm grass.
Meanwhile, the Tortoise walked slowly and steadily, step by step, never pausing for a single moment.
When the Hare awoke from his sleep, he saw the Tortoise just near the winning goal. The Hare ran as fast as his strong legs could carry him, but he was too late.
Slow and steady wins the race.`
            },
            {
                id: 'ch-2',
                title: 'The Boy Who Cried Wolf',
                wordCount: 410,
                content: `A shepherd boy tended his master's sheep near a dark forest not far from the village.
Finding the hours long and lonely, he thought of a trick to amuse himself.
He ran toward the village shouting with all his might, "Wolf! Wolf! The wolf is chasing the sheep!"
The villagers dropped their work and ran quickly to the field to help him. When they arrived, panting and worried, they found the boy laughing merrily at his clever trick.
A few days later, the boy shouted again, "Wolf! Wolf! A huge beast is attacking!"
Once more, the good villagers ran to his aid, only to be laughed at again.
Then, one evening, a real wolf emerged from the forest shadows. The creature seized a lamb.
Terrified, the boy ran toward the village shouting in genuine horror, "Wolf! Wolf! Please help me!"
This time, the villagers heard his cries, but they shook their heads.
"He will not fool us again," they said.
Nobody believes a liar, even when he tells the truth.`
            },
            {
                id: 'ch-3',
                title: 'The North Wind and the Sun',
                wordCount: 420,
                content: `A dispute arose between the North Wind and the Sun as to which was the stronger of the two.
While they were debating with great energy, a traveller walked along the country road, wrapped tightly in a thick cloak.
"Let us agree," said the Sun, "that whichever of us makes this traveller remove his cloak shall be recognized as the more powerful."
"Agreed!" roared the North Wind.
The North Wind began to blow with furious icy gusts. Dust flew into the air, and trees bent low. But the colder the wind blew, the tighter the shivering traveller wrapped his warm cloak around his shoulders.
At last, exhausted, the North Wind gave up in despair.
Then the Sun smiled gently, bathing the landscape in friendly warmth.
The traveller unfastened his buttons. As the golden rays grew brighter and warmer, the traveller felt so hot that he took off his heavy cloak and sat down happily under the shade of an oak tree.
Gentleness and persuasion are often much more powerful than force.`
            }
        ]
    },

    // ==========================================
    // A2 - ELEMENTARY
    // ==========================================
    {
        id: 'curated-alices-adventures',
        title: "Alice's Adventures in Wonderland",
        author: 'Lewis Carroll',
        level: 'A2',
        description: 'Follow curious young Alice down the rabbit-hole into a whimsical subterranean world of talking animals and mad tea parties.',
        coverGradient: 'linear-gradient(135deg, #701a75 0%, #4a044e 100%)',
        accentColor: '#d946ef',
        totalWords: 1650,
        estimatedMinutes: 9,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: Down the Rabbit-Hole',
                wordCount: 550,
                content: `Alice was beginning to get very tired of sitting by her sister on the riverbank, and of having nothing to do. Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.
"And what is the use of a book," thought Alice, "without pictures or conversations?"
Suddenly, a White Rabbit with pink eyes ran close by her!
There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!"
When the Rabbit actually took a watch out of its waistcoat-pocket, looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it.
Burning with curiosity, she ran across the meadow after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.
In another moment, down went Alice after it, never once considering how in the world she was to get out again.`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: The Pool of Tears',
                wordCount: 520,
                content: `"Curiouser and curiouser!" cried Alice, so surprised that for the moment she quite forgot how to speak good English. "Now I'm opening out like the largest telescope that ever was! Good-bye, feet!"
For when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off.
She was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.
Poor Alice! The most she could do was to lie down on one side and look through into the garden with one eye; but to get through was more hopeless than ever.
She sat down and began to cry again.
"You ought to be ashamed of yourself," said Alice to herself, "a great girl like you to go on crying in this way! Stop this moment, I tell you!"
She went on crying all the same, shedding gallons of tears, until there was a large pool around her, about four inches deep and reaching half down the hall.`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: A Mad Tea-Party',
                wordCount: 580,
                content: `There was a table set out under a tree in front of the house, and the March Hare and the Hatter were having tea at it. A Dormouse was sitting between them, fast asleep, and the other two were using it as a cushion, resting their elbows on it, and talking over its head.
"Very uncomfortable for the Dormouse," thought Alice; "only, as it's asleep, I suppose it doesn't mind."
The table was a large one, but the three were all crowded together at one corner of it.
"No room! No room!" they cried out when they saw Alice coming.
"There's plenty of room!" said Alice indignantly, and she sat down in a large arm-chair at one end of the table.
"Have some wine," the March Hare said in an encouraging tone.
Alice looked all round the table, but there was nothing on it but tea.
"I don't see any wine," she remarked.
"There isn't any," said the March Hare.
"Then it wasn't very civil of you to offer it," said Alice angrily.
"It wasn't very civil of you to sit down without being invited," said the March Hare.`
            }
        ]
    },
    {
        id: 'curated-tom-sawyer',
        title: 'The Adventures of Tom Sawyer',
        author: 'Mark Twain',
        level: 'A2',
        description: 'The spirited escapades of a mischievous boy growing up along the mighty Mississippi River in nineteenth-century America.',
        coverGradient: 'linear-gradient(135deg, #7c2d12 0%, #431407 100%)',
        accentColor: '#ea580c',
        totalWords: 1580,
        estimatedMinutes: 9,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: The Glorious Whitewasher',
                wordCount: 540,
                content: `Saturday morning was come, and all the summer world was bright and fresh, and brimming with life. There was a song in every heart; and if the heart was young, the music came out of the lips.
Tom appeared on the sidewalk with a bucket of whitewash and a long-handled brush. He surveyed the wooden fence, and all gladness left him. Thirty yards of broad fence nine feet high!
He dipped his brush and rolled it along the top plank; repeated the operation; compared the insignificant whitewashed streak with the far-reaching continent of unwhitewashed fence, and sat down on a tree-box out of breath.
Presently, Ben Rogers came into view, eating an apple, and making noises like a grand steamboat: "Ding-dong-dong, ch-ch-ch, stop her!"
Tom went on whitewashing — paid no attention to the steamboat.
Ben stared a moment and then said, "Hi-yi! You're up a stump, ain't you? Got to work, hey?"
Tom wheeled suddenly and said, "Why, it's you, Ben! I warn't noticing."
"Say, I'm going in a-swimming, I am. Don't you wish you could? But of course you'd druther work, wouldn't you?"
Tom contemplated the boy a bit, and said, "What do you call work?"
"Why, ain't that work?"
Tom resumed his whitewashing, and answered carelessly, "Well, maybe it is, and maybe it ain't. All I know is, it suits Tom Sawyer."
"Oh come, now, you don't mean to let on that you like it?"
The brush continued to move. "Like it? Well, I don't see why I oughtn't to like it. Does a boy get a chance to whitewash a fence every day?"
That put the thing in a new light.`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: The Midnight Adventure',
                wordCount: 530,
                content: `At half-past nine, Tom and Huck were ready. They met by the old tannery.
The night was dense and silent. The boys crept along the path toward the graveyard, which was about a mile and a half from the village. It sat upon a lonely hill, surrounded by a dilapidated wooden fence.
Over the fence they scrambled, and made their way among the tall weeds and forgotten tombstones.
A faint wind moaned through the branches of the ancient trees. The boys spoke in hushed whispers.
"Huck, do you believe the dead people like our being here?" asked Tom.
"I wish I knowed," whispered Huck. "It's awful solemn-like, ain't it?"
They sat down behind three large elm trees that grew near the grave of Hoss Williams, who had been buried only two weeks before.
Suddenly, a light flickered in the distance.
"Look!" gasped Tom. "What's that?"
"It's devils, sure!" whispered Huck, trembling violently.`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: The Lost Cave',
                wordCount: 510,
                content: `The cave was a vast, labyrinthine network of passages that branched off into darkness.
Tom and Becky had wandered far from the picnic party. Hand in hand, they entered a great cavern where stalactites hung like gleaming chandeliers from the arched stone ceiling.
"Look, Becky," said Tom, holding his small candle high. "See that tunnel? Let's write our names on the wall with candle smoke!"
They laughed and smoked their initials upon the white limestone.
Then they walked further, intrigued by the subterranean wonders. Soon the echoes of their friends' voices died away entirely.
After an hour, Becky paused. Her candle was burning low.
"Tom, which way did we come?" she asked timidly.
Tom looked around. Every branching tunnel looked identical in the flickering shadows.
"Don't worry, Becky," said Tom, trying to keep his voice steady. "We'll turn back now."
They walked for twenty minutes, but found only unfamiliar caverns.
They were lost in the great depths of McDougal's cave.`
            }
        ]
    },

    // ==========================================
    // B1 - INTERMEDIATE
    // ==========================================
    {
        id: 'curated-sherlock-holmes',
        title: 'A Scandal in Bohemia',
        author: 'Sir Arthur Conan Doyle',
        level: 'B1',
        description: 'Sherlock Holmes matches wits with Irene Adler, the legendary opera singer who outmaneuvers the worlds greatest detective.',
        coverGradient: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
        accentColor: '#818cf8',
        totalWords: 1820,
        estimatedMinutes: 10,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: The Bohemian King',
                wordCount: 610,
                content: `To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex.
One night — it was on the twentieth of March, 1888 — I was returning from a journey to a patient, when my way led me through Baker Street. As I passed the well-remembered door, I was seized with a keen desire to see Holmes again, and to know how he was employing his extraordinary powers.
His rooms were brilliantly lit, and, even as I looked up, I saw his tall, spare figure pass twice in dark silhouette against the blind. He was pacing the room swiftly, eagerly, with his head sunk upon his chest and his hands clasped behind him.
A visitor arrived shortly thereafter: a man no less than six feet six inches in height, with the chest and limbs of a Hercules. He wore a mask of black velvet across the upper part of his face.
"I understand that you have been consulted," said the visitor, speaking with a strong German accent. "You may address me as the Count von Kramm, a Bohemian nobleman."
"Pray take a seat, Your Majesty," said Holmes quietly.
The masked giant sprang from his chair and paced up and down the room in uncontrollable agitation. Then, with a gesture of desperation, he tore the mask from his face and hurled it upon the ground.
"You are right!" he cried. "I am the King of Bohemia. Why should I attempt to conceal it?"`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: The Disguise at the Church',
                wordCount: 590,
                content: `At nine o'clock the next morning, Holmes was already out upon the streets, disguised as a drunken groom with inflamed eyes and dishevelled whiskers.
When he returned to Baker Street in the afternoon, he was laughing heartily.
"Watson," he cried, "you would never guess how I have spent my morning, or what an extraordinary spectacle I have just witnessed!"
"I cannot imagine," I answered.
"I went to Briony Lodge, the villa of Miss Irene Adler," Holmes recounted. "I engaged the local cabmen and stable-hands in conversation. They all agree: she is the daintiest thing under a bonnet on this planet.
While I watched the house, a cab arrived and out sprang a handsome young lawyer named Godfrey Norton. He rushed inside, and within minutes, both he and Irene emerged in separate carriages, driving furiously toward the Church of St. Monica.
I followed on foot. When I reached the church, there were only the clergyman, the lady, and the gentleman before the altar. Suddenly, Norton saw me and dragged me toward the rail!
'Come, my good fellow!' he cried. 'You will do! Only three minutes or it will not be legal!'
And so, Watson, I was hurried into becoming the sole witness to their marriage ceremony!"`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: Irene Adlers Triumph',
                wordCount: 620,
                content: `Holmes arranged a clever deception that evening. With the assistance of several street urchins, he staged a mock brawl outside Irene's window. Disguised as an injured clergyman, Holmes was carried into her sitting room.
At a prearranged signal, I tossed a smoke rocket through the window and shouted "Fire!"
Just as Holmes had anticipated, in the moment of sudden peril, Irene rushed to a concealed panel in the wall to rescue her most precious possession — the incriminating royal photograph.
"We have her secret!" Holmes whispered triumphant as we walked away. "Tomorrow at eight, we shall call with the King and recover the packet."
Promptly at eight the following morning, Holmes, the King, and I arrived at Briony Lodge.
An elderly housemaid greeted us at the door.
"Mr. Sherlock Holmes, I believe?" she asked.
"I am Mr. Holmes," said my companion, looking startled.
"My mistress informed me that you were likely to call," the maid said. "She departed with her husband for the Continent on the five-fifteen express from Charing Cross!"
Holmes rushed to the secret recess behind the sliding panel. The photograph of the King was gone.
In its place lay a portrait of Irene Adler herself in an evening dress, accompanied by a letter addressed to Sherlock Holmes:
"You did it very handsomely, Mr. Holmes. But I was warned that you were the formidable adversary. The King may rest easy; I love and am loved by a better man. I leave him only this portrait to remember me by."`
            }
        ]
    },
    {
        id: 'curated-time-machine',
        title: 'The Time Machine',
        author: 'H. G. Wells',
        level: 'B1',
        description: 'A Victorian inventor travels eight hundred thousand years into the far future to discover the fate of humankind.',
        coverGradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        accentColor: '#6366f1',
        totalWords: 1750,
        estimatedMinutes: 10,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: The Principle of Time Travel',
                wordCount: 560,
                content: `The Time Traveller was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burned brightly in the library grate, and the soft radiance of the incandescent lights caught the bubbles that flashed and passed in our wine glasses.
"You must follow me carefully," said he. "I shall have to overturn one or two ideas that are almost universally accepted. The geometry, for instance, that they taught you at school is founded on a misconception."
"Is that not rather large for us to take on trust?" asked Filby, an argumentative person with red hair.
"I do not mean to ask you to accept anything without reasonable ground for it," said the Time Traveller. "Can an instantaneous cube exist?"
"Don't follow you," said Filby.
"Can a cube that does not last for any time at all have a real existence?"
Filby looked pensive. "Clearly not," said he.
"Then," continued the Time Traveller, "any real body must have extension in four directions: it must have Length, Breadth, Thickness, and — Duration. There is no difference between Time and any of the three dimensions of Space, except that our consciousness moves along it!"`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: The Golden Age of 802,701 AD',
                wordCount: 590,
                content: `I pushed the starting lever forward. Night followed day like the flapping of a black wing. The sun hopped across the heavens in a minute and each minute marked a year.
When at last I pulled the stopping lever, the machine tipped over on soft turf.
I looked around. I was on what seemed to be a little lawn in a garden, surrounded by rhododendron bushes. A colossal figure, carved in white marble, towered through the drizzle: a winged Sphinx.
Presently, I saw a group of figures approaching. They were slight creatures, perhaps four feet high, clad in purple tunics, their limbs bare and their feet sandals. They had the exquisite beauty of porcelain dolls.
They gathered around me with soft cooing sounds. One of them touched my hand; another gently offered me a garland of strange, fragrant blossoms.
In their eyes was neither fear nor surprise. They had the graceful indolence of children.
"Here," I thought, "is the ultimate outcome of human progress. Humanity has eliminated hardship, war, and disease, subsisting in gentle harmony upon abundant fruits."
How grievously mistaken I was!`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: The Morlocks in the Deep',
                wordCount: 600,
                content: `My euphoria was shattered when I discovered that my Time Machine had vanished from the pedestal by the Sphinx!
Tire tracks in the grass led directly toward the bronze doors beneath the statue.
A few days later, while escaping the noon heat in a subterranean ruin, I peered down a deep ventilation shaft. Far below in the gloom, two luminous, reflective eyes blinked up at me.
A creature scrambled swiftly up the metallic rungs — a pale, ape-like thing with bleach-white skin and oversized grey eyes that shunned the sunlight.
I struck a match, and it fled in terror into the dark recesses.
In that chilling moment, the hideous truth dawned upon me. Humankind had not remained unified. It had split into two distinct evolutionary races: the beautiful, fragile Eloi who danced on the surface in the sun, and the subterranean Morlocks, workers exiled underground who toiled in darkness to maintain the machinery.
And the Morlocks did not serve the Eloi out of loyalty. Like cattle, the surface dwellers were bred for food.`
            }
        ]
    },

    // ==========================================
    // B2 - UPPER-INTERMEDIATE
    // ==========================================
    {
        id: 'curated-great-gatsby',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        level: 'B2',
        description: 'A tragic exploration of wealth, obsession, and the elusive American Dream amidst the sparkling Jazz Age in New York.',
        coverGradient: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
        accentColor: '#f59e0b',
        totalWords: 1950,
        estimatedMinutes: 11,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: The Green Light at Daisy’s Dock',
                wordCount: 650,
                content: `In my younger and more vulnerable years my father gave me some advice that I’ve been turning over in my mind ever since.
"Whenever you feel like criticizing anyone," he told me, "just remember that all the people in this world haven’t had the advantages that you’ve had."
In consequence, I’m inclined to reserve all judgements, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores.
When I came back from the East last autumn I felt that I wanted the world to be in uniform and at a sort of moral attention forever. Only Gatsby, the man who gives his name to this book, was exempt from my reaction — Gatsby, who represented everything for which I have an unaffected scorn. If personality is an unbroken series of successful gestures, then there was something gorgeous about him, some heightened sensitivity to the promises of life.
It was late on a summer night when I walked home to my modest bungalow in West Egg. As I stood in the yard, I saw that I was not alone. Fifty feet away a figure had emerged from the shadow of my neighbour’s colossal mansion and was standing with his hands in his pockets regarding the silver pepper of the stars.
He stretched out his arms toward the dark water in a curious way, and, far as I was from him, I could have sworn he was trembling. Involuntarily I glanced seaward — and distinguished nothing except a single green light, minute and far away, that might have been the end of a dock.`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: The Lavish Parties of West Egg',
                wordCount: 640,
                content: `There was music from my neighbour's house through the summer nights. In his blue gardens men and girls came and went like moths among the whisperings and the champagne and the stars.
At high tide in the afternoon I watched his guests diving from the tower of his raft, or taking the sun on the hot sand of his beach while his two motor-boats slit the waters of the Sound, drawing aquaplanes over cataracts of foam.
On week-ends his Rolls-Royce became an omnibus, bearing parties to and from the city between nine in the morning and long past midnight.
By seven o'clock the orchestra has arrived, no thin five-piece affair, but a whole pitful of oboes and trombones and saxophones and viols and cornets and piccolos, and low and high drums. The last swimmers have come in from the beach now and are dressing up-stairs; the cars from New York are parked five deep in the drive, and already the halls and salons and verandas are gaudy with primary colours.
I believe that on the first night I went to Gatsby's house I was one of the few guests who had actually been invited. People were not invited — they went there. They got into automobiles which bore them out to Long Island, and somehow they ended up at Gatsby's door.`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: Meeting Gatsby',
                wordCount: 660,
                content: `I was sitting with Jordan Baker at a table under the marquee when a man of about my own age looked at me and smiled.
"Your face is familiar," he said politely. "Weren't you in the First Division during the war?"
"Why, yes. I was in the Twenty-eighth Infantry."
"I was in the Seventh myself," he said. "I knew I'd seen you somewhere before."
We talked for a moment about some wet, grey little villages in France.
"This is an unusual party for me," I said after a moment. "I haven't even seen the host. I live over there" — I waved my hand toward the modest hedge — "and this man Gatsby sent over his chauffeur with an invitation."
For a moment he looked at me as if he failed to understand.
"I'm Gatsby," he said suddenly.
"What!" I exclaimed. "Oh, I beg your pardon."
"I thought you knew, old sport. I'm afraid I'm not a very good host."
He smiled understandingly — much more than understandingly. It was one of those rare smiles with a quality of eternal reassurance in it, that you may come across four or five times in life. It faced — or seemed to face — the whole external world for an instant, and then concentrated on you with an irresistible prejudice in your favour. It understood you just as far as you wanted to be understood, believed in you as you would like to believe in yourself, and assured you that it had precisely the impression of you that, at your best, you hoped to convey.`
            }
        ]
    },
    {
        id: 'curated-dorian-gray',
        title: 'The Picture of Dorian Gray',
        author: 'Oscar Wilde',
        level: 'B2',
        description: 'An aesthetic and philosophical gothic novel about an innocent youth who trades his soul for eternal beauty while his portrait bears his sins.',
        coverGradient: 'linear-gradient(135deg, #4c0519 0%, #2e0210 100%)',
        accentColor: '#f43f5e',
        totalWords: 1880,
        estimatedMinutes: 10,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: The Studio of Basil Hallward',
                wordCount: 610,
                content: `The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden, there came through the open door the heavy scent of the lilac, or the more delicate perfume of the pink-flowering thorn.
From the corner of the divan of Persian saddle-bags on which he was lying, Lord Henry Wotton could just catch the gleam of the honey-sweet and honey-coloured blossoms of a laburnum.
In the centre of the room, clamped to an upright easel, stood the full-length portrait of a young man of extraordinary personal beauty, and in front of it, some little distance away, was sitting the artist himself, Basil Hallward.
"It is your best work, Basil, the best thing you have ever done," said Lord Henry languidly. "You must certainly send it next year to the Grosvenor. The Academy is too large and too vulgar."
"I don't think I shall send it anywhere," the painter answered, tossing his head back in that odd way that used to make his friends laugh at Oxford. "No; I shall not send it anywhere."
Lord Henry elevated his eyebrows and looked at him in amazement. "Not send it anywhere? My dear fellow, why? What odd chaps you painters are! An artist should do anything in the world to gain a reputation."
"I know you will laugh at me," Basil replied, "but I really can't exhibit it. I have put too much of myself into it."`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: Lord Henry’s Tempting Words',
                wordCount: 630,
                content: `Dorian Gray was leaning against the table, listening with wide, fascinated eyes to Lord Henry Wotton.
"Yes," continued Lord Henry, "the only way to get rid of a temptation is to yield to it. Resist it, and your soul grows sick with longing for the things it has forbidden to itself, with desire for what its monstrous laws have made monstrous and unlawful. It has been said that the great events of the world take place in the brain. It is in the brain, and the brain only, that the great sins of the world take place also."
The youth stood motionless, wondering. Dim words had touched secret chords in his soul, and they seemed to vibrate with a strange energy.
"Youth! Youth! There is absolutely nothing in the world but youth!" exclaimed Lord Henry. "Some day, when you are old and wrinkled and ugly, when thought has seared your forehead with its lines, you will feel it terribly. Now, wherever you go, you charm the world. Will it always be so? You have a wonderfully beautiful face, Mr. Gray. Don't frown. You have. And beauty is a form of genius — is higher, indeed, than genius, as it needs no explanation."
Dorian listened, and the words sank into his consciousness like wine poured into pure water.`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: The Fatal Wish',
                wordCount: 640,
                content: `Basil Hallward put the finishing touches to the portrait.
"It is quite finished," cried the artist, stepping back from the easel.
Lord Henry came over and examined the picture. "It is the finest portrait of modern times," he declared enthusiastically.
Dorian made no answer. He stood gazing at the likeness of himself, wonder-struck. The sense of his own beauty came on him like a revelation. He had never felt it before. Basil Hallward’s compliments had seemed to him to be merely the charming exaggerations of friendship. Then had come Lord Henry Wotton with his strange panegyric on youth, his terrible warning of its brevity.
Sharp tears of self-pity came into his eyes.
"How sad it is!" murmured Dorian Gray, with his eyes still fixed upon his own image. "How sad it is! I shall grow old, and horrible, and dreadful. But this picture will remain always young. It will never be older than this particular day of June... If it were only the other way! If it were I who was to be always young, and the picture that was to grow old! For that — for that — I would give everything! Yes, there is nothing in the whole world I would not give! I would give my soul for that!"`
            }
        ]
    },

    // ==========================================
    // C1 - ADVANCED
    // ==========================================
    {
        id: 'curated-dracula',
        title: 'Dracula',
        author: 'Bram Stoker',
        level: 'C1',
        description: 'An atmospheric masterpiece of gothic horror narrated through diaries, letters, and ships logs across Victorian Europe.',
        coverGradient: 'linear-gradient(135deg, #3f0f18 0%, #1a0509 100%)',
        accentColor: '#e11d48',
        totalWords: 2100,
        estimatedMinutes: 12,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: Jonathan Harkers Transylvanian Journal',
                wordCount: 700,
                content: `3 May. Bistritz. — Left Munich at 8:35 P.M., on 1st May, arriving at Vienna early next morning; should have arrived at 6:46, but train was an hour late. Buda-Pesth seems a wonderful place, from the glimpse which I got of it from the train and the little I could walk through the streets.
The impression I had was that we were leaving the West and entering the East; the most western of splendid bridges over the Danube was taking us among the traditions of Turkish rule.
We left in pretty good time, and came after nightfall to Klausenburgh. Here I stopped for the night at the Hotel Royale. I had for dinner, or rather supper, a chicken done up some way with red pepper, which was very good but thirsty. (Mem., get recipe for Mina.)
I read that every known superstition in the world is gathered into the horseshoe of the Carpathians, as if it were the centre of some sort of imaginative whirlpool.
Before I left London, Count Dracula had directed me to go to the Golden Krone Hotel in Bistritz. When the landlord saw me, he crossed himself.
"Must you go?" he whispered in German. "Do you not know what day it is?"
I answered that it was the fourth of May.
He shook his head: "It is the eve of St. George's Day. Tonight, when the clock strikes midnight, all the evil things in the world will have full sway! Do you know where you are going, and what you are going to?"
He seemed in such evident distress that I tried to comfort him, but without effect. Finally, he took a crucifix from his neck and offered it to me.
As an English Churchman, I have been taught to regard such things as somewhat idolatrous, and yet it seemed so ungracious to refuse an old man kind-hearted in such a state of mind, that I took it, and put it round my neck. It is at my neck now, and whether it is the old man's association or the crucifix itself, I do not know, but I do not feel nearly as easy in my mind as usual.`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: Castle Dracula',
                wordCount: 690,
                content: `The carriage plunged into the Borgo Pass as darkness fell. The horses began to strain and rear; around us in the pine forests, the howling of wolves rose in an unholy crescendo.
Suddenly, a tall caleche drawn by four coal-black horses emerged from the fog. The driver was a tall man, with a long brown beard and a great black hat, which hid his face from me. I could only see the gleam of a pair of very bright eyes, which seemed red in the lamplight.
He took my luggage and seated me beside him without uttering a single syllable.
At length, we arrived in the courtyard of a vast ruined castle, from whose tall black windows no ray of light issued, and whose broken battlements showed a jagged line against the moonlit sky.
The driver helped me down, sprang back into the box, shook the reins, and vanished into the darkness.
I stood in silence, listening to the desolate wind among the ruins.
Presently, I heard a heavy step approaching behind the massive iron-studded oak door. Key after key grated in rusty locks, a heavy chain rattled, and the door swung slowly open.
Within stood a tall old man, clean shaven save for a long white moustache, and clad in black from head to foot, without a single speck of colour about him anywhere. He held in his hand an antique silver lamp, in which the flame burned without chimney or globe of any kind, throwing long quivering shadows.
"Welcome to my house! Enter freely and of your own will!" he said in courtly English.
He made no motion of stepping to meet me, but stood like a statue, as though his gesture of welcome had fixed him into stone.
The instant, however, that I had stepped over the threshold, he moved impulsively forward, and holding out his hand grasped mine with a strength which made me wince, an effect which was not lessened by the fact that it seemed as cold as ice — more like the hand of a dead than a living man.`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: The Counts Shadow',
                wordCount: 710,
                content: `His face was a strong — a very strong — aquiline, with high bridge of the thin nose and peculiarly arched nostrils; with lofty domed forehead, and hair growing scantily round the temples, but profusely elsewhere. His eyebrows were very massive, almost meeting over the nose, and with bushy hair that seemed to curl in its own profusion. The mouth, so far as I could see it under the heavy moustache, was fixed and rather cruel-looking, with peculiarly sharp white teeth; these protruded over the lips, whose remarkable ruddiness showed astonishing vitality in a man of his years. For the rest, his ears were pale, and at the tops extremely pointed; the chin was broad and strong, and the cheeks firm though thin. The general effect was one of extraordinary pallor.
Hitherto I had noticed the backs of his hands as they lay on his knees in the firelight, and they had seemed rather white and fine; but seeing them now close to me, I could not but notice that they were rather coarse — broad, with squat fingers. Strange to say, there were hairs in the centre of the palm. The nails were long and fine, and cut to a sharp point.
As the Count leaned over me and his hands touched me, I could not repress a shudder. It may have been that his breath was rank, but a horrible feeling of nausea came over me, which, do what I would, I could not conceal.
The Count, evidently noticing it, drew back with a grim sort of smile, which showed more than he had yet done his protuberant teeth, and sat himself down again on the other side of the stone fireplace.
We were silent for a while; and as I glanced towards the window I saw the first dim streak of the coming dawn. There seemed a strange stillness over everything; but as I listened I heard as if from down below in the valley the howling of many wolves.
The Count’s eyes gleamed, and he said:
"Listen to them — the children of the night. What music they make!"`
            }
        ]
    },
    {
        id: 'curated-frankenstein',
        title: 'Frankenstein',
        author: 'Mary Shelley',
        level: 'C1',
        description: 'The definitive philosophical sci-fi gothic tragedy about ambition, scientific hubris, and the consequences of isolation.',
        coverGradient: 'linear-gradient(135deg, #14532d 0%, #052e16 100%)',
        accentColor: '#22c55e',
        totalWords: 2050,
        estimatedMinutes: 11,
        chapters: [
            {
                id: 'ch-1',
                title: 'Chapter 1: The Spark of Being',
                wordCount: 680,
                content: `It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out, when, by the glimmer of the half-extinguished light, I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs.
How can I describe my emotions at this catastrophe, or how delineate the wretch whom with such infinite pains and care I had endeavoured to form? His limbs were in proportion, and I had selected his features as beautiful. Beautiful! Great God!
His yellow skin scarcely covered the work of muscles and arteries beneath; his hair was of a lustrous black, and flowing; his teeth of a pearly whiteness; but these luxuriances only formed a more horrid contrast with his watery eyes, that seemed almost of the same colour as the dun-white sockets in which they were set, his shrivelled complexion and straight black lips.
The different accidents of life are not so changeable as the feelings of human nature. I had worked hard for nearly two years, for the sole purpose of infusing life into an inanimate body. For this I had deprived myself of rest and health. I had desired it with an ardour that far exceeded moderation; but now that I had finished, the beauty of the dream vanished, and breathless horror and disgust filled my heart. Unable to endure the aspect of the being I had created, I rushed out of the room and continued a long time traversing my bed-chamber, unable to compose my mind to sleep.`
            },
            {
                id: 'ch-2',
                title: 'Chapter 2: The Creature’s Tale in the Alps',
                wordCount: 690,
                content: `It was nearly noon when I arrived at the top of the ascent. For some time I sat upon the rock that overlooks the sea of ice. A mist covered both that and the surrounding mountains. Presently a breeze dissipated the cloud, and I descended upon the glacier.
As I was thus traversing the snow, I suddenly beheld the figure of a man, at some distance, advancing towards me with superhuman speed. He bounded over the crevices in the ice, among which I had walked with caution; his stature, also, as he approached, seemed to exceed that of man.
I was troubled; a mist came over my eyes, and I felt faint, but the sight of the tremendous being aroused me to sensations of fierce rage.
"Devil," I exclaimed, "do you dare approach me? And do not you fear the fierce vengeance of my arm wreaked on your miserable head? Begone, vile insect! Or rather, stay, that I may trample you to dust!"
"I expected this reception," said the daemon. "All men hate the wretched; how, then, must I be hated, who am miserable beyond all living things! Yet you, my creator, detest and spurn me, thy creature, to whom thou art bound by ties only dissoluble by the annihilation of one of us. You purpose to kill me. How dare you sport thus with life? Do your duty towards me, and I will do mine towards you and the rest of mankind. If you will comply with my conditions, I will leave them and you at peace; but if you refuse, I will glut the maw of death, until it be satiated with the blood of your remaining friends."`
            },
            {
                id: 'ch-3',
                title: 'Chapter 3: The Cry for Companionship',
                wordCount: 680,
                content: `"Remember that I am thy creature; I ought to be thy Adam, but I am rather the fallen angel, whom thou drivest from joy for no misdeed. Everywhere I see bliss, from which I alone am irrevocably excluded. I was benevolent and good; misery made me a fiend. Make me happy, and I shall again be virtuous."
"Begone! I will not hear you. There can be no community between you and me; we are enemies."
"How can I move thee? Will no entreaties cause thee to turn a favourable eye upon thy creature, who implores thy goodness and compassion? Believe me, Frankenstein: I was benevolent; my soul glowed with love and humanity; but am I not alone, miserably alone? You, my creator, would tear me to pieces and triumph; remember that, and tell me why I should pity man more than he pities me? You would not call it murder if you could precipitate me into one of those ice-rifts and destroy my frame, the work of your own hands. Shall I respect man when he contemns me? Let him live with me in the interchange of kindness, and instead of injury I would bestow every benefit upon him with tears of gratitude at his acceptance. But that cannot be; the human senses are insurmountable barriers to our union. Yet mine shall not be the submission of abject slavery. I will revenge my injuries; if I cannot inspire love, I will cause fear, and chiefly towards you my arch-enemy, because my creator, do I swear inextinguishable hatred. Have a care; I will work at your destruction, nor finish until I desolate your heart, so that you shall curse the hour of your birth."`
            }
        ]
    }
];
