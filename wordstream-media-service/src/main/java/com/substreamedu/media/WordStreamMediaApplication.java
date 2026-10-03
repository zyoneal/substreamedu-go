package com.substreamedu.media;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class WordStreamMediaApplication {

    public static void main(String[] args) {
        SpringApplication.run(WordStreamMediaApplication.class, args);
    }

}
