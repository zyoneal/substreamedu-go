package com.substreamedu.dictionary;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class WordStreamDictionaryApplication {

    public static void main(String[] args) {
        SpringApplication.run(WordStreamDictionaryApplication.class, args);
    }

}
