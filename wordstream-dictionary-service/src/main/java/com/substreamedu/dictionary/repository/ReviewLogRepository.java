package com.substreamedu.dictionary.repository;

import com.substreamedu.dictionary.model.ReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewLogRepository extends JpaRepository<ReviewLog, Long> {
    List<ReviewLog> findAllByUserId(UUID userId);
}
