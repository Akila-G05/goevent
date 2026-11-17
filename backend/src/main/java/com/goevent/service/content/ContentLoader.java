package com.goevent.service.content;

import java.util.List;
import java.util.Map;

public interface ContentLoader {
    String getKey();
    List<Map<String, Object>> load();
}
