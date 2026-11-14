package com.goevent.config;

import com.azure.communication.email.EmailClientBuilder;
import com.azure.communication.email.models.EmailMessage;
import com.azure.identity.ManagedIdentityCredentialBuilder;
import com.goevent.service.AdminEmailDelivery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.net.URI;
import java.time.Duration;

@Configuration
@EnableScheduling
public class AcsEmailConfig {
    @Bean
    @ConditionalOnProperty(name="app.email.enabled",havingValue="true")
    AdminEmailDelivery acsDelivery(@Value("${app.email.endpoint:}") String endpoint,
        @Value("${app.email.sender:}") String sender,@Value("${app.email.managed-identity-client-id:}") String clientId) {
        var uri=URI.create(endpoint);
        if(!"https".equals(uri.getScheme())||uri.getHost()==null||!uri.getHost().endsWith(".communication.azure.com")
            ||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null
            ||(!uri.getPath().isEmpty()&&!"/".equals(uri.getPath()))||!sender.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            throw new IllegalArgumentException("Valid ACS HTTPS endpoint and verified sender required");
        var credential=new ManagedIdentityCredentialBuilder();
        if(!clientId.isBlank()) credential.clientId(clientId);
        var client=new EmailClientBuilder().endpoint(endpoint).credential(credential.build()).buildClient();
        return (recipient,subject,body) -> {
            var message=new EmailMessage().setSenderAddress(sender).setToRecipients(recipient)
                .setSubject(subject).setBodyPlainText(body);
            var result=client.beginSend(message).waitForCompletion(Duration.ofSeconds(60)).getValue();
            if(result==null||!"Succeeded".equalsIgnoreCase(result.getStatus().toString()))
                throw new IllegalStateException("ACS did not accept message");
            return result.getId();
        };
    }
}
