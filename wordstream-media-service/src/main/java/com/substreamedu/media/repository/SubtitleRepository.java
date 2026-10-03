package com.substreamedu.media.repository;

import com.substreamedu.media.model.Subtitle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubtitleRepository extends JpaRepository<Subtitle, Long> {

    boolean existsByUserIdAndName(UUID userId, String name);

    @Query("SELECT s.text FROM Subtitle s WHERE s.userId = :userId AND s.name = :name ORDER BY s.startTimeMs")
    List<String> findTextsByName(@Param("userId") UUID userId, @Param("name") String name);

    @Query("SELECT DISTINCT s.name FROM Subtitle s WHERE s.userId = :userId")
    List<String> findDistinctSubtitleNames(@Param("userId") UUID userId);

    List<Subtitle> findByUserIdAndNameOrderByStartTimeMs(UUID userId, String name);

    @Modifying
    @Query("DELETE FROM Subtitle s WHERE s.userId = :userId AND s.name = :name")
    void deleteByUserIdAndName(@Param("userId") UUID userId, @Param("name") String name);
}
