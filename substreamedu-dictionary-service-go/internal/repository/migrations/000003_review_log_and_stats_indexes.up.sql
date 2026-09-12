CREATE INDEX IF NOT EXISTS idx_review_log_user_date ON review_log(user_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_log_user_card ON review_log(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_user_cardtype_status ON dictionary(user_id, card_type, status);
