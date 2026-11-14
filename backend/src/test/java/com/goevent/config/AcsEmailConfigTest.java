package com.goevent.config;

import com.goevent.service.AdminEmailDelivery;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class AcsEmailConfigTest {
    @Test void emailIsDisabledWithoutExplicitOptIn() {
        try(var context=new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test",Map.of("app.email.enabled","false")));
            context.register(AcsEmailConfig.class); context.refresh();
            assertTrue(context.getBeansOfType(AdminEmailDelivery.class).isEmpty());
        }
    }
    @Test void rejectsInvalidEndpointOrSenderBeforeConstructingAzureClient() {
        var config=new AcsEmailConfig();
        for(String endpoint:new String[]{"http://example.communication.azure.com","https://example.invalid","https://example.communication.azure.com/path","https://user:secret@example.communication.azure.com","https://example.communication.azure.com?query=1"}) {
            assertThrows(IllegalArgumentException.class,()->config.acsDelivery(endpoint,"sender@example.invalid",""));
        }
        assertThrows(IllegalArgumentException.class,()->config.acsDelivery("https://example.communication.azure.com","", ""));
    }
}
