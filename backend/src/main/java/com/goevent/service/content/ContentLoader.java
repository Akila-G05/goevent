package com.goevent.service.content;

import java.util.List;
import java.util.Map;

/** Loads one named block of reference content for {@code ContentService}. */
public interface ContentLoader {

    String getKey();

    List<Map<String, Object>> load();
}
