package com.goevent.service.content.loader;

import com.goevent.repository.ContentRepo;
import com.goevent.service.content.ContentLoader;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class UniversityLoader implements ContentLoader {

    private final ContentRepo contentRepo;

    public UniversityLoader(ContentRepo contentRepo) {
        this.contentRepo = contentRepo;
    }

    @Override
    public String getKey() {
        return "universities";
    }

    @Override
    public List<Map<String, Object>> load() {
        return contentRepo.getUniversities();
    }
}
