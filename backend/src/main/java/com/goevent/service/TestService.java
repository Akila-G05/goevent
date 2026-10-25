package com.goevent.service;

import com.goevent.dto.TestDTO;
import com.goevent.repository.TestRepo;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TestService {

    private final TestRepo testRepo;

    public TestService(TestRepo testRepo) {
        this.testRepo = testRepo;
    }

    public List<TestDTO> getData() {
        int x = 1;
        int y = 2;

        System.out.println(x+y);

        return testRepo.getAllEvents();
    }

}
