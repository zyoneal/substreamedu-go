package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSplitNewCardQuota(t *testing.T) {
	tests := []struct {
		name        string
		targetNew   int
		maxNewWords int
		want        int
	}{
		{"full budget: recognition capped at max new words", 30, 15, 15},
		{"budget below cap: recognition takes all of it", 10, 15, 10},
		{"exactly the cap", 15, 15, 15},
		{"zero budget", 0, 15, 0},
		{"negative budget never goes negative", -4, 15, 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, SplitNewCardQuota(tc.targetNew, tc.maxNewWords))
		})
	}
}

func TestProductionGateEnabled(t *testing.T) {
	t.Run("enabled by default", func(t *testing.T) {
		t.Setenv("SRS_GATE_PRODUCTION_CARDS", "")
		assert.True(t, productionGateEnabled())
	})

	t.Run("disabled only by explicit false", func(t *testing.T) {
		t.Setenv("SRS_GATE_PRODUCTION_CARDS", "false")
		assert.False(t, productionGateEnabled())
	})

	t.Run("any other value keeps the gate on", func(t *testing.T) {
		t.Setenv("SRS_GATE_PRODUCTION_CARDS", "true")
		assert.True(t, productionGateEnabled())
	})
}
