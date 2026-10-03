package com.substreamedu.dictionary.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user_srs_parameters")
public class UserSRSParameters {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    private Float w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12;

    @CreationTimestamp
    private Instant lastOptimized;

    public float[] toArray() {
        if (w0 == null)
            return null;
        return new float[] { w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12 };
    }
}
