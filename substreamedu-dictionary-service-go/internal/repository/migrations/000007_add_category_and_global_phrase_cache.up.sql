-- Spec 26: High-Throughput Batch Vocabulary Categorization Engine

ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS category VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_dictionary_user_category ON dictionary (user_id, category);

CREATE TABLE IF NOT EXISTS global_phrase_categories (
    phrase TEXT PRIMARY KEY,
    category_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_global_phrase_lower ON global_phrase_categories (LOWER(phrase));

-- Pre-seed high-frequency phrasal verbs, idioms, and core expressions
INSERT INTO global_phrase_categories (phrase, category_id, category_name) VALUES
-- 1: Emotions & Traits
('freak out', 1, 'Emotions & Traits'),
('calm down', 1, 'Emotions & Traits'),
('cheer up', 1, 'Emotions & Traits'),
('tear up', 1, 'Emotions & Traits'),
('blow up', 1, 'Emotions & Traits'),
('break down', 1, 'Emotions & Traits'),
('get over', 1, 'Emotions & Traits'),
('fall for', 1, 'Emotions & Traits'),
('bottle up', 1, 'Emotions & Traits'),
('chill out', 1, 'Emotions & Traits'),
('on cloud nine', 1, 'Emotions & Traits'),
('down in the dumps', 1, 'Emotions & Traits'),

-- 2: Work & Business
('touch base', 2, 'Work & Business'),
('circle back', 2, 'Work & Business'),
('lay off', 2, 'Work & Business'),
('take over', 2, 'Work & Business'),
('step down', 2, 'Work & Business'),
('sign off', 2, 'Work & Business'),
('call off', 2, 'Work & Business'),
('wrap up', 2, 'Work & Business'),
('burn the midnight oil', 2, 'Work & Business'),
('cut corners', 2, 'Work & Business'),
('back to the drawing board', 2, 'Work & Business'),
('climb the corporate ladder', 2, 'Work & Business'),
('by the book', 2, 'Work & Business'),

-- 3: Tech & Science
('log in', 3, 'Tech & Science'),
('log out', 3, 'Tech & Science'),
('back up', 3, 'Tech & Science'),
('shut down', 3, 'Tech & Science'),
('boot up', 3, 'Tech & Science'),
('plug in', 3, 'Tech & Science'),
('scroll down', 3, 'Tech & Science'),
('zoom in', 3, 'Tech & Science'),
('hack into', 3, 'Tech & Science'),
('pop up', 3, 'Tech & Science'),
('state of the art', 3, 'Tech & Science'),
('cutting edge', 3, 'Tech & Science'),

-- 4: Daily Life & Home
('wake up', 4, 'Daily Life & Home'),
('get up', 4, 'Daily Life & Home'),
('tidy up', 4, 'Daily Life & Home'),
('clean up', 4, 'Daily Life & Home'),
('throw away', 4, 'Daily Life & Home'),
('run out of', 4, 'Daily Life & Home'),
('pick up', 4, 'Daily Life & Home'),
('drop off', 4, 'Daily Life & Home'),
('put away', 4, 'Daily Life & Home'),
('turn on', 4, 'Daily Life & Home'),
('turn off', 4, 'Daily Life & Home'),
('pay off', 4, 'Daily Life & Home'),

-- 5: Food & Dining
('eat out', 5, 'Food & Dining'),
('chow down', 5, 'Food & Dining'),
('whip up', 5, 'Food & Dining'),
('boil down', 5, 'Food & Dining'),
('cut down on', 5, 'Food & Dining'),
('dig in', 5, 'Food & Dining'),
('pig out', 5, 'Food & Dining'),
('wolf down', 5, 'Food & Dining'),
('piece of cake', 5, 'Food & Dining'),
('spill the beans', 5, 'Food & Dining'),
('bite off more than you can chew', 5, 'Food & Dining'),

-- 6: Travel & Places
('set off', 6, 'Travel & Places'),
('head out', 6, 'Travel & Places'),
('check in', 6, 'Travel & Places'),
('check out', 6, 'Travel & Places'),
('take off', 6, 'Travel & Places'),
('touch down', 6, 'Travel & Places'),
('drop by', 6, 'Travel & Places'),
('stop by', 6, 'Travel & Places'),
('pull over', 6, 'Travel & Places'),
('hit the road', 6, 'Travel & Places'),
('off the beaten track', 6, 'Travel & Places'),

-- 7: Social & Communication
('blend in', 7, 'Social & Communication'),
('fit in', 7, 'Social & Communication'),
('stand out', 7, 'Social & Communication'),
('reach out', 7, 'Social & Communication'),
('bring up', 7, 'Social & Communication'),
('point out', 7, 'Social & Communication'),
('catch up', 7, 'Social & Communication'),
('hang out', 7, 'Social & Communication'),
('get along', 7, 'Social & Communication'),
('fall out', 7, 'Social & Communication'),
('open up', 7, 'Social & Communication'),
('speak up', 7, 'Social & Communication'),
('hear out', 7, 'Social & Communication'),
('see eye to eye', 7, 'Social & Communication'),
('break the ice', 7, 'Social & Communication'),

-- 8: Art, Media & Entertainment
('show off', 8, 'Art, Media & Entertainment'),
('act out', 8, 'Art, Media & Entertainment'),
('turn up', 8, 'Art, Media & Entertainment'),
('tune in', 8, 'Art, Media & Entertainment'),
('sing along', 8, 'Art, Media & Entertainment'),
('act up', 8, 'Art, Media & Entertainment'),
('steal the show', 8, 'Art, Media & Entertainment'),
('in the limelight', 8, 'Art, Media & Entertainment'),
('break a leg', 8, 'Art, Media & Entertainment'),

-- 9: Nature & Environment
('die out', 9, 'Nature & Environment'),
('dry up', 9, 'Nature & Environment'),
('freeze over', 9, 'Nature & Environment'),
('pour down', 9, 'Nature & Environment'),
('clear up', 9, 'Nature & Environment'),
('blow over', 9, 'Nature & Environment'),
('tip of the iceberg', 9, 'Nature & Environment'),
('under the weather', 9, 'Nature & Environment'),

-- 10: Health & Fitness
('work out', 10, 'Health & Fitness'),
('warm up', 10, 'Health & Fitness'),
('cool down', 10, 'Health & Fitness'),
('pass out', 10, 'Health & Fitness'),
('come down with', 10, 'Health & Fitness'),
('shake off', 10, 'Health & Fitness'),
('bulk up', 10, 'Health & Fitness'),
('burn out', 10, 'Health & Fitness'),
('in bad shape', 10, 'Health & Fitness'),
('fit as a fiddle', 10, 'Health & Fitness'),

-- 11: Slang, Idioms & Phrasal Verbs
('spill the tea', 11, 'Slang, Idioms & Phrasal Verbs'),
('no cap', 11, 'Slang, Idioms & Phrasal Verbs'),
('low key', 11, 'Slang, Idioms & Phrasal Verbs'),
('high key', 11, 'Slang, Idioms & Phrasal Verbs'),
('screw up', 11, 'Slang, Idioms & Phrasal Verbs'),
('mess up', 11, 'Slang, Idioms & Phrasal Verbs'),
('rip off', 11, 'Slang, Idioms & Phrasal Verbs'),
('bail on', 11, 'Slang, Idioms & Phrasal Verbs'),
('ghost someone', 11, 'Slang, Idioms & Phrasal Verbs'),
('bite the bullet', 11, 'Slang, Idioms & Phrasal Verbs'),
('hit the jackpot', 11, 'Slang, Idioms & Phrasal Verbs'),
('call it a day', 11, 'Slang, Idioms & Phrasal Verbs'),

-- 12: Abstract & Philosophy
('come across', 12, 'Abstract & Philosophy'),
('figure out', 12, 'Abstract & Philosophy'),
('turn out', 12, 'Abstract & Philosophy'),
('count on', 12, 'Abstract & Philosophy'),
('stand for', 12, 'Abstract & Philosophy'),
('lead to', 12, 'Abstract & Philosophy'),
('bring about', 12, 'Abstract & Philosophy'),
('bear in mind', 12, 'Abstract & Philosophy'),
('food for thought', 12, 'Abstract & Philosophy'),
('once in a blue moon', 12, 'Abstract & Philosophy')
ON CONFLICT (phrase) DO NOTHING;
