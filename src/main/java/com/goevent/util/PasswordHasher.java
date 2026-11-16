package com.goevent.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Stores passwords as SHA-256 digests so the plain text never reaches a data file. */
public final class PasswordHasher {

    private PasswordHasher() {
    }

    public static String hash(String password) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(password.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available on this JVM.", e);
        }
    }
}
