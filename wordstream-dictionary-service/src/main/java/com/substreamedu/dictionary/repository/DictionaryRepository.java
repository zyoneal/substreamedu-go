package com.substreamedu.dictionary.repository;

import com.substreamedu.dictionary.dto.response.DictionaryGroupDto;
import com.substreamedu.dictionary.model.Dictionary;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface DictionaryRepository extends JpaRepository<Dictionary, Long> {

        int countByUserId(UUID userId);

        boolean existsByUserIdAndResourceName(UUID userId, String resourceName);

        void deleteByUserIdAndResourceName(UUID userId, String resourceName);

        List<Dictionary> findAllByUserIdAndResourceNameIgnoreCase(UUID userId, String resourceName);

        @Query("SELECT d FROM Dictionary d WHERE d.userId = :userId")
        List<Dictionary> findAll(@Param("userId") UUID userId);

        @Query(value = "SELECT * FROM dictionary WHERE user_id = :userId ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
        List<Dictionary> findRandomWordsByUserId(@Param("userId") UUID userId, @Param("count") int count);

        @Query("SELECT d FROM Dictionary d WHERE d.userId = :userId AND " +
                        "(d.nextRepetitionDate <= :today OR d.learningDue <= CURRENT_TIMESTAMP OR d.status = 'new') " +
                        "ORDER BY d.nextRepetitionDate ASC, d.difficultyScore DESC")
        List<Dictionary> findDueWordsSorted(@Param("userId") UUID userId, @Param("today") LocalDate today,
                        Pageable pageable);

        @Query(value = "SELECT * FROM dictionary WHERE user_id = :userId AND status = 'new' ORDER BY RANDOM()", nativeQuery = true)
        List<Dictionary> findRandomNewWords(@Param("userId") UUID userId, Pageable pageable);

        @Query("SELECT new com.substreamedu.dictionary.dto.response.DictionaryGroupDto(d.resourceName, count(d)) " +
                        "FROM Dictionary d WHERE d.userId = :userId GROUP BY d.resourceName")
        List<DictionaryGroupDto> findAllDictionaryGroups(@Param("userId") UUID userId);

        @Query("SELECT count(d) FROM Dictionary d WHERE d.userId = :userId AND d.status = 'mastered'")
        int countMasteredCardsByUserId(@Param("userId") UUID userId);

        @Query("SELECT count(d) FROM Dictionary d WHERE d.userId = :userId AND d.status = 'new'")
        int countNewCardsByUserId(@Param("userId") UUID userId);

        @Query("SELECT count(d) FROM Dictionary d WHERE d.userId = :userId AND d.nextRepetitionDate <= :today")
        int countWordsForRepetitionByUserId(@Param("userId") UUID userId, @Param("today") LocalDate today);

        @Query("SELECT count(d) FROM Dictionary d WHERE d.userId = :userId AND d.repetitionLevel > 5")
        int countLearnedWordsByUserId(@Param("userId") UUID userId);

        @Query("SELECT DISTINCT d.lastReviewed FROM Dictionary d WHERE d.userId = :userId AND d.lastReviewed IS NOT NULL ORDER BY d.lastReviewed DESC")
        List<LocalDate> findDistinctReviewDates(@Param("userId") UUID userId);
}
