package com.substreamedu.dictionary.repository;

import com.substreamedu.dictionary.model.UserSRSParameters;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserSRSParametersRepository extends JpaRepository<UserSRSParameters, UUID> {
}
