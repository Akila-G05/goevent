package com.goevent.service;

import com.goevent.repository.AdminEmailRepository;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.mockito.Mockito.*;

class AdminEmailWorkerTest {
    @Test void successRecordsAcsAcceptanceAndFailureQueuesRetryWithoutSendingAgainInTransaction() {
        var repository=mock(AdminEmailRepository.class); var delivery=mock(AdminEmailDelivery.class);
        when(repository.claim()).thenReturn(Map.of("id",1L,"attempts",1,"recipient","fixture@example.invalid","subject","Test","body","Test"));
        when(delivery.send(anyString(),anyString(),anyString())).thenReturn("operation-fixture");
        var worker=new AdminEmailWorker(repository,delivery); worker.deliverOne();
        verify(repository).accepted(1L,1,"operation-fixture");
        when(delivery.send(anyString(),anyString(),anyString())).thenThrow(new IllegalStateException("Test failure"));
        worker.deliverOne(); verify(repository).failed(1L,1);
    }
    @Test void idleQueueDoesNotSend() {
        var repository=mock(AdminEmailRepository.class); var delivery=mock(AdminEmailDelivery.class);
        when(repository.claim()).thenReturn(null);
        new AdminEmailWorker(repository,delivery).deliverOne(); verifyNoInteractions(delivery);
    }
}
