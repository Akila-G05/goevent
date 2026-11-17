
package com.goevent.service;

import com.goevent.service.content.ContentLoader;
import com.goevent.util.AppUtil;
import com.google.gson.JsonObject;

import org.slf4j.Logger;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ContentService {

    private static final Logger logger = AppUtil.getLogger(ContentService.class);

    private final Map<String, ContentLoader> loaders;

    public ContentService(List<ContentLoader> contentLoaders) {
        loaders = new HashMap<>();

        for (ContentLoader loader : contentLoaders) {
            loaders.put(loader.getKey(), loader);
        }
    }

    private List<Map<String, Object>> load(String key) {
        ContentLoader loader = loaders.get(key);

        if (loader == null) {
            throw new IllegalArgumentException(
                    "Content loader not found: " + key
            );
        }

        return loader.load();
    }

    // Load inital content
    public String getInitialData() {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            JsonObject dataObject = new JsonObject();

            dataObject.add("roles", AppUtil.gson.toJsonTree(load("roles")));

            dataObject.add("categories", AppUtil.gson.toJsonTree(load("categories")));

            dataObject.add("eventStatuses", AppUtil.gson.toJsonTree(load("eventStatuses")));

            dataObject.add("organizationTypes", AppUtil.gson.toJsonTree(load("organizationTypes")));

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

    // Load universitis
    public String getUniversities() {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            responseObject.add("data",
                    AppUtil.gson.toJsonTree(load("universities")));

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

    // Load organisations
    public String getOrganizations() {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message = "";

        try {
            responseObject.add("data",
                    AppUtil.gson.toJsonTree(load("organizations")));

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
