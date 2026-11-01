
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
        System.out.println("check initial data cache");
        return contentService.getInitialData();
    }

    @GetMapping("/universities")
    public String getUniversities() {
        System.out.println("check universities data cache");
        return contentService.getUniversities();
    }

    @GetMapping("/organizations")
    public String getOrganizations() {
        System.out.println("check organizations data cache");
        return contentService.getOrganizations();
    }
}
