package com.goevent.service;

import com.goevent.dto.TestDTO;
import com.goevent.repository.TestRepo;
import com.goevent.util.AppUtil;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.slf4j.Logger;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TestService {

    private final TestRepo testRepo;
    private static final Logger logger = AppUtil.getLogger(TestService.class);

    public TestService(TestRepo testRepo) {
        this.testRepo = testRepo;
    }

    public String getData() {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message = "";

        int x = 1;
        int y = 2;

        System.out.println(x+y);

        try {
            List<TestDTO> data = testRepo.getAllData();
            responseObject.add("dbdata", AppUtil.gson.toJsonTree(data));
            message = "data retrieved successfully";
            status = true;
        } catch (Exception e) {
            message = "Failed to retrieve data";
            logger.error("Failed to retrieve data", e);
//            throw new RuntimeException(e);
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.gson.toJson(responseObject);
    }

}
