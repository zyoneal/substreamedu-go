package fsrs

import "time"

type Clock interface {
	Now() time.Time
}

type RealClock struct{}

func (RealClock) Now() time.Time	{ return time.Now().UTC() }

type StubClock struct {
	current time.Time
}

func NewStubClock(t time.Time) *StubClock {
	return &StubClock{current: t}
}

func (c *StubClock) Now() time.Time	{ return c.current }

func (c *StubClock) Advance(d time.Duration) {
	c.current = c.current.Add(d)
}

func (c *StubClock) AdvanceDays(days int) {
	c.current = c.current.AddDate(0, 0, days)
}

func (c *StubClock) Set(t time.Time) {
	c.current = t
}
