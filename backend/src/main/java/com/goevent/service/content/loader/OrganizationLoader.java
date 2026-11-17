package com.goevent.service.content.loader;

import com.goevent.repository.ContentRepo;
import com.goevent.service.content.ContentLoader;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class OrganizationLoader implements ContentLoader {
    private final ContentRepo contentRepo;

    public OrganizationLoader(ContentRepo contentRepo) {
        this.contentRepo = contentRepo;
    }

    @Override
    public String getKey() {
        return "organizations";
    }

    @Override
    public List<Map<String, Object>> load() {
        return contentRepo.getOrganizations();
    }
}
