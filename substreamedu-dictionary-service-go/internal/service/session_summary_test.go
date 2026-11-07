package service

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func TestParseQuestionsResponse(t *testing.T) {
	t.Run("Standard JSON Array", func(t *testing.T) {
		raw := `["Why did Sarah hesitate before speaking?", "What would you do if you were in Alex's shoes?"]`
		questions := parseQuestionsResponse(raw)
		assert.Len(t, questions, 2)
		assert.Equal(t, "Why did Sarah hesitate before speaking?", questions[0])
		assert.Equal(t, "What would you do if you were in Alex's shoes?", questions[1])
	})

	t.Run("Markdown Wrapped JSON Array", func(t *testing.T) {
		raw := "```json\n[\n  \"How did the character react?\",\n  \"What was the turning point?\"\n]\n```"
		questions := parseQuestionsResponse(raw)
		assert.Len(t, questions, 2)
		assert.Equal(t, "How did the character react?", questions[0])
		assert.Equal(t, "What was the turning point?", questions[1])
	})

	t.Run("JSON Object with questions key", func(t *testing.T) {
		raw := `{"questions": ["Why was the remark so hurtful?", "How could they resolve this conflict?"]}`
		questions := parseQuestionsResponse(raw)
		assert.Len(t, questions, 2)
		assert.Equal(t, "Why was the remark so hurtful?", questions[0])
		assert.Equal(t, "How could they resolve this conflict?", questions[1])
	})

	t.Run("Numbered Plain Text Fallback", func(t *testing.T) {
		raw := "Here are the questions:\n1. Why did the protagonist leave the room?\n2. What would happen if they apologized?\n3. How did their relationship change?"
		questions := parseQuestionsResponse(raw)
		assert.Len(t, questions, 3)
		assert.Equal(t, "Why did the protagonist leave the room?", questions[0])
		assert.Equal(t, "What would happen if they apologized?", questions[1])
		assert.Equal(t, "How did their relationship change?", questions[2])
	})

	t.Run("Bullet Points Fallback", func(t *testing.T) {
		raw := "- Why did she make that remark?\n* What was the consequence of that decision?"
		questions := parseQuestionsResponse(raw)
		assert.Len(t, questions, 2)
		assert.Equal(t, "Why did she make that remark?", questions[0])
		assert.Equal(t, "What was the consequence of that decision?", questions[1])
	})
}

func TestSessionSummaryPayloadParsing(t *testing.T) {
	payload := `{"items":[{"word":"tenure","meaning":"permanent academic position (постоянная должность)","context":"But then my mom got offered tenure at Northwestern University, so it was goodbye Africa and hello high school."},{"word":"collateral damage","meaning":"unintended harm or loss (сопутствующий ущерб)","context":"If he has any chance of happiness with Taylor-- So then, I'm just collateral damage?"},{"word":"lavatory","meaning":"a room containing a toilet (туалет)","context":"You need the lavatory pass."},{"word":"bedtime stories","meaning":"stories told before sleep (сказки на ночь)","context":"The perfect bedtime stories."},{"word":"trapped out here","meaning":"stuck in this place (застряли здесь)","context":"So we're trapped out here?"},{"word":"clad","meaning":"dressed or clothed (одетый)","context":"Always in a full face of makeup, clad in tasteful clothing with just a hint of sexiness, and it drove him crazy"},{"word":"Right back at ya","meaning":"Same to you (Взаимно)","context":"Right back at ya."},{"word":"sand it down","meaning":"smooth by sanding (отшлифовать)","context":"I know it looks like shit from the outside now, but I figured we'd sand it down and put on a fresh coat of paint."},{"word":"spark plugs","meaning":"engine ignition components (свечи зажигания)","context":"I'm gonna go get some dry spark plugs."},{"word":"discerning","meaning":"having good judgment (разборчивый)","context":"To a discerning eye, they're very, very different."},{"word":"sleep it off","meaning":"recover by sleeping (отоспаться)","context":"[Charlie] I wish I could say he'll sleep it off, but..."},{"word":"quirky","meaning":"причудливый","context":"[quirky, upbeat music playing] You know what?"},{"word":"take a beat","meaning":"pause and reflect (сделать паузу)","context":"that affected the rest of their life, just take a beat before you blow up your relationship with Drew."},{"word":"this too shall pass","meaning":"everything is temporary (и это пройдет)","context":"[sighs] ♪ And, oh, this too shall pass ♪ ♪ But I saw the pictures, you're looking fine ♪"},{"word":"meltdown","meaning":"кризис","context":"My dad was married three times, so I've seen every variety of post-divorce meltdown."},{"word":"put your back into it","meaning":"exert more effort (налегайте, ребята)","context":"[Percy] All right, put your back into it, boys."},{"word":"see-through","meaning":"transparent, allowing light through (прозрачный)","context":"Maybe some other time, when my shirt isn't see-through."},{"word":"coxswain","meaning":"person who steers a boat (рулевой)","context":"I'll be coxswain."},{"word":"maritime","meaning":"relating to the sea (морской)","context":"Master of maritime knots."},{"word":"torn up","meaning":"ruined or devastated (разрушена)","context":"Your whole life was torn up by this, while he went off and made a shit ton of money, with a good job, in a gorgeous apartment."},{"word":"calculus","meaning":"branch of mathematics (математический анализ)","context":"You're taking 12th-grade calculus?"},{"word":"walked up","meaning":"approached on foot (подошел)","context":"If Charlie hadn't walked up, I think my almost-kiss would've been not so almost."},{"word":"mean-ass","meaning":"impressively strong or skillful (злобный)","context":"I mean, you throw a mean-ass punch."},{"word":"send-off","meaning":"прощальный вечер","context":"I need to give Sue the send-off she deserves."},{"word":"teal","meaning":"бирюзовый","context":"Okay, 'cause you just seem like-- Like someone who's looking for the teal tablecloths that I ordered for your mother's memorial?"},{"word":"rash decision","meaning":"hasty, unwise choice (опрометчивое решение)","context":"Coming from someone who made a rash decision that affected the rest of their life,"},{"word":"front-row seat","meaning":"close observation point (место в первом ряду)","context":"I had a front-row seat to your breakups with Percy, all of them."}],"learningLanguage":"en","fluentLanguage":"ru"}`

	var req dto.SessionSummaryRequest
	err := json.Unmarshal([]byte(payload), &req)
	assert.NoError(t, err)
	assert.Equal(t, 27, len(req.Items))
	assert.Equal(t, "en", req.LearningLanguage)
	assert.Equal(t, "ru", req.FluentLanguage)
}
