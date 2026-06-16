package com.molizhishu.demo;

import com.molizhishu.demo.config.MolizhishuProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Spring Boot entry point for the Java/MyBatis demo.
 *
 * <p>{@link EnableScheduling} enables the polling scheduler in the
 * {@code com.molizhishu.demo.schedule} package. Business code should stay in
 * services; scheduled triggering belongs in scheduler components.</p>
 */
@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(MolizhishuProperties.class)
public class MolizhishuJavaApplication {

	public static void main(String[] args) {
		SpringApplication.run(MolizhishuJavaApplication.class, args);
	}

}
