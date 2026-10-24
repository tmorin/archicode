package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.AccessDeniedException;
import java.nio.file.FileSystemException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import lombok.val;
import org.junit.jupiter.api.Test;

/** The three ways the workspace file cannot be had, and how each says why in one line (issue #146). */
class WorkspaceFileExceptionTest {

    private static final Path FILE = Path.of("/work/.archicode.yaml");

    private static String unreadable(IOException e) {
        val failure = WorkspaceFileException.unreadable(FILE, e);
        assertEquals(WorkspaceFileException.Reason.UNREADABLE, failure.getReason());
        return failure.getMessage();
    }

    @Test
    void shouldSayThatTheFileDoesNotExistAndHowToNameAnotherOne() {
        val failure = WorkspaceFileException.missing(FILE);
        assertEquals(WorkspaceFileException.Reason.MISSING, failure.getReason());
        assertEquals(
            "the workspace file `/work/.archicode.yaml` does not exist (`-w` names another one)",
            failure.getMessage()
        );
    }

    @Test
    void shouldSayTheSentenceOfTheFormerName() {
        val failure = WorkspaceFileException.formerName();
        assertEquals(WorkspaceFileException.Reason.FORMER_NAME, failure.getReason());
        assertEquals(WorkspaceFactory.FORMER_NAME_SENTENCE, failure.getMessage());
    }

    @Test
    void shouldTakeTheReasonTheFileSystemGaveInLowerCase() {
        assertEquals(
            "the workspace file `/work/.archicode.yaml` cannot be read: permission denied",
            unreadable(new FileSystemException("/work/.archicode.yaml", null, "Permission denied"))
        );
    }

    @Test
    void shouldNameThePermissionWhenAnAccessDeniedExceptionSaysOnlyThePath() {
        assertEquals(
            "the workspace file `/work/.archicode.yaml` cannot be read: permission denied",
            unreadable(new AccessDeniedException("/work/.archicode.yaml"))
        );
    }

    @Test
    void shouldNameTheMissingFileWhenANoSuchFileExceptionSaysOnlyThePath() {
        assertEquals(
            "the workspace file `/work/.archicode.yaml` cannot be read: no such file",
            unreadable(new NoSuchFileException("/work/.archicode.yaml"))
        );
    }

    @Test
    void shouldTakeTheParenthesisAtTheEndOfTheMessageOfAFileNotFoundException() {
        assertEquals(
            "the workspace file `/work/.archicode.yaml` cannot be read: permission denied",
            unreadable(new FileNotFoundException("/work/.archicode.yaml (Permission denied)"))
        );
    }

    @Test
    void shouldKeepTheWholeMessageWhenItHasNoParenthesis() {
        assertEquals(
            "the workspace file `/work/.archicode.yaml` cannot be read: disk on fire",
            unreadable(new IOException("Disk on fire"))
        );
    }

    @Test
    void shouldSayTheNameOfTheFailureWhenItSaysNothing() {
        assertEquals(
            "the workspace file `/work/.archicode.yaml` cannot be read: IOException",
            unreadable(new IOException())
        );
    }

    @Test
    void shouldNotCutAnEmptyReason() {
        assertEquals(
            "the workspace file `/work/.archicode.yaml` cannot be read: ",
            unreadable(new FileSystemException("/work/.archicode.yaml", null, ""))
        );
    }
}
