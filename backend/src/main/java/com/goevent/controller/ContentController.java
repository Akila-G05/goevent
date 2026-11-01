
package com.goevent.controller;

import com.goevent.service.ContentService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/content")
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/initial-data")
    public String getInitialData() {
        return contentService.getInitialData();
    }

    @GetMapping("/universities")
    public String getUniversities() {
        return contentService.getUniversities();
    }

    @GetMapping("/organizations")
    public String getOrganizations() {
        return contentService.getOrganizations();
    }
}
