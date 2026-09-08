# Local Android debug build on Windows

For `apps/mobile/mido-barber` (and any other brand once it has an `android/`).

## Quick start

```bat
subst M: "C:\Users\Kerillos Abdelsayed\Documents\github\funfsterne"
cd /d M:\apps\mobile\mido-barber
npx expo run:android
```

`subst` does **not** move or copy the repository — `M:\` and the original
`C:\Users\...\funfsterne` are the same bytes on disk. It does not survive a
reboot; re-run the first line after restarting.

---

## Why `M:` is required

`ninja: error: Filename longer than 260 characters`

CMake mirrors each source file's absolute path into the path of its object
file. For a source in a hoisted npm monorepo that produces, for one file in
`react-native-safe-area-context`:

```
C:\Users\Kerillos Abdelsayed\Documents\github\funfsterne\apps\mobile\mido-barber
  \android\app\.cxx\Debug\<hash>\arm64-v8a
  \safeareacontext_autolinked_build\CMakeFiles\react_codegen_safeareacontext.dir
  \C_\Users\Kerillos_Abdelsayed\Documents\github\funfsterne\apps\mobile\node_modules
  \react-native-safe-area-context\common\cpp\react\renderer\components
  \safeareacontext\RNCSafeAreaViewShadowNode.cpp.o
```

**398 characters.** Windows' `MAX_PATH` is 260 and ninja hard-fails there.

The repo path appears **twice** — once as the build directory and once
mirrored into the object name — so shortening it with a drive alias pays
twice: 398 → ~287 characters.

`LongPathsEnabled` is already `1` on this machine and does not help: ninja
and the NDK toolchain do not opt into long-path awareness.

## Why the drive alias alone is not enough

287 is still over 260. The mirrored source path is the dominant term, so the
second fix targets exactly that.

### `CMAKE_OBJECT_PATH_MAX=240`

`android/app/build.gradle`, inside `defaultConfig`:

```gradle
externalNativeBuild {
    cmake {
        arguments "-DCMAKE_OBJECT_PATH_MAX=240"
    }
}
```

This is CMake's own designed remedy: when a computed object path would
exceed the limit, CMake substitutes a short hashed directory name for the
mirrored source path. It changes **build layout only** — no compiler flags,
no ABI, no difference in the produced `.so`.

**This is applied by a config plugin, not by hand.**
`android/app/build.gradle` is generated, so a manual edit survives only
until the next `npx expo prebuild --clean`. The plugin lives at
`apps/mobile/mido-barber/plugins/withWindowsCmakePathFix.js` and is
registered in `app.json` under `expo.plugins`. It is idempotent and throws a
clear error if React Native's template changes shape, so a future SDK bump
fails at prebuild with a readable message rather than 20 minutes later
inside ninja.

## Emulator architecture

`Pixel_10_Pro` is **x86_64** (`adb shell getprop ro.product.cpu.abi`). Its
`abilist` also advertises `arm64-v8a` via binary translation, but native
libraries built for arm64 are not what it loads, and building them costs
roughly 4× the native compile time for nothing.

`android/gradle.properties`:

```properties
reactNativeArchitectures=x86_64
```

**Restore all four before building for a real device or the Play Store:**

```properties
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
```

This is deliberately *not* in the config plugin. Baking a single ABI into
the app config would silently produce x86_64-only release builds on EAS.
It is a local, reversible edit to a generated file, and EAS is unaffected
because it regenerates `android/` from `app.json`.

To keep the file pristine instead, pass it per-invocation:

```bat
gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64
```

## Cleaning stale native caches

The `.cxx` directories cache **absolute paths** from the previous
configuration, so after changing the effective drive letter or the ABI list
they must go, or CMake will keep reusing the old long paths:

```bat
cd /d M:\apps\mobile\mido-barber\android
rmdir /s /q app\.cxx app\build build
```

Do not delete `android/app/src` — that is source, including
`MainActivity.kt` and `MainApplication.kt`.

---

## Known machine-level blocker: `Unable to establish loopback connection`

If Gradle fails **instantly**, before any task runs, with:

```
FAILURE: Build failed with an exception.
* What went wrong:
java.io.IOException: Unable to establish loopback connection
Caused by: java.net.SocketException: Invalid argument: connect
    at sun.nio.ch.PipeImpl$Initializer$LoopbackConnector.run(PipeImpl.java:138)
```

…this is **not** a project problem. `java.nio.channels.Pipe` is implemented
on Windows as a loopback TCP socket pair, and the JVM cannot create one.

Reproduce it independently of Gradle — save as `PipeTest.java` and run
`java PipeTest.java`:

```java
import java.nio.channels.Pipe;
public class PipeTest {
  public static void main(String[] a) {
    try { Pipe p = Pipe.open(); System.out.println("PIPE_OK");
          p.sink().close(); p.source().close(); }
    catch (Throwable t) { System.out.println("PIPE_FAIL: " + t); }
  }
}
```

Measured on this machine on 2026-09-07:

| JDK | Result |
|---|---|
| `C:\Program Files\Java\jdk-21` (Oracle 21.0.1) | `PIPE_OK` — 25/25 |
| `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot` | `PIPE_FAIL` — 0/25 |

Ruled out during diagnosis: the `M:` alias (fails identically from `C:`),
the Gradle daemon (`--no-daemon` fails too), memory pressure (freed to
5.8 GB, no change), ephemeral port exhaustion (151 of 16384 in use),
Windows Firewall (no rules reference any java binary), third-party
security software (Defender only), and the Winsock LSP catalog (all
Microsoft entries).

Remedies, in order of least disruption — **all need an elevated prompt**:

```bat
netsh winsock reset
```

then reboot. If that does not fix it, reinstall the Microsoft JDK 17 build,
which is the one that fails outright.

`JAVA_HOME` is currently `C:\Program Files\Java\jdk-21` while `java` on
`PATH` is 17. Expo SDK 54 / RN 0.81.5 / AGP expect **JDK 17**, so once the
loopback fault is fixed, point `JAVA_HOME` at a *working* JDK 17.
