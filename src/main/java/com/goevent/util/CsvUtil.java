package com.goevent.util;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * Turns values into comma-separated lines and back. Each value is URL-encoded,
 * so commas, separators and line breaks inside names never break the file layout.
 */
public final class CsvUtil {

    private static final String SEPARATOR = ",";

    private CsvUtil() {
    }

    public static String line(String... fields) {
        return Arrays.stream(fields).map(CsvUtil::encode).collect(Collectors.joining(SEPARATOR));
    }

    public static List<String> parse(String line) {
        return Arrays.stream(line.split(SEPARATOR, -1)).map(CsvUtil::decode).toList();
    }

    public static String encode(String value) {
        return URLEncoder.encode(value, UTF_8);
    }

    public static String decode(String value) {
        return URLDecoder.decode(value, UTF_8);
    }
}
