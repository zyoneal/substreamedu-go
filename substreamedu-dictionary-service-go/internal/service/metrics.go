package service

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	ReviewsTotal	= promauto.NewCounterVec(prometheus.CounterOpts{
		Name:	"substreamedu_reviews_total",
		Help:	"The total number of word reviews processed by the dictionary service",
	}, []string{"rating", "status"})

	SessionDuration	= promauto.NewHistogram(prometheus.HistogramOpts{
		Name:		"substreamedu_session_duration_seconds",
		Help:		"Distribution of time users spend on review sessions",
		Buckets:	prometheus.DefBuckets,
	})

	CardsDueCount	= promauto.NewGauge(prometheus.GaugeOpts{
		Name:	"substreamedu_cards_due_today",
		Help:	"Estimated number of cards due for review across all users",
	})

	DictionaryAdditions	= promauto.NewCounter(prometheus.CounterOpts{
		Name:	"substreamedu_dictionary_additions_total",
		Help:	"The total number of words added to dictionaries",
	})
)
