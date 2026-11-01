
package com.goevent.service;

import com.goevent.repository.ContentRepo;
import com.goevent.util.AppUtil;
import com.google.gson.JsonObject;

import org.slf4j.Logger;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ContentService {

    private final ContentRepo contentRepo;

    private static final Logger logger =
            AppUtil.getLogger(ContentService.class);

    public ContentService(ContentRepo contentRepo) {
        this.contentRepo = contentRepo;
    }

    // Load initial content
    public String getInitialData() {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            JsonObject dataObject = new JsonObject();

            dataObject.add("roles", AppUtil.gson.toJsonTree(contentRepo.getRoles()));

            dataObject.add("categories", AppUtil.gson.toJsonTree(contentRepo.getCategories()));

            dataObject.add("eventStatuses", AppUtil.gson.toJsonTree(contentRepo.getEventStatuses()));

            dataObject.add("organizationTypes", AppUtil.gson.toJsonTree(contentRepo.getOrganizationTypes()));

            responseObject.add("data", dataObject);

            status = true;
            message = "Initial content loaded successfully";

        } catch (Exception e) {
            message = "Failed to load initial content";
            logger.error("Initial content loading error", e);
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.gson.toJson(responseObject);
    }

    // Load universities
    public String getUniversities() {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            List<Map<String, Object>> universities = contentRepo.getUniversities();

            responseObject.add("data", AppUtil.gson.toJsonTree(universities));

            status = true;
            message = "Universities loaded successfully";

        } catch (Exception e) {
            message = "Failed to load universities";
            logger.error("University loading error", e);
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.gson.toJson(responseObject);
    }

    // Load organizations
    public String getOrganizations() {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            List<Map<String, Object>> organizations = contentRepo.getOrganizations();

            responseObject.add("data", AppUtil.gson.toJsonTree(organizations));

            status = true;
            message = "Organizations loaded successfully";

        } catch (Exception e) {
            message = "Failed to load organizations";
            logger.error("Organization loading error", e);
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.gson.toJson(responseObject);
    }
}
