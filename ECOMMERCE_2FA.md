# 2FA & MFA IMPLEMENTATION - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Two-Factor Authentication, TOTP, Recovery Codes, Setup Wizard

---

## 1. TWO-FACTOR AUTHENTICATION ENTITIES

### 1.1 Domain Model

```csharp
// Domain/Entities/TwoFactorAuth.cs
public class TwoFactorAuth
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public TwoFactorAuthType Type { get; set; }           // TOTP, SMS, Email
  public bool IsEnabled { get; set; }
  public bool IsVerified { get; set; }
  
  // TOTP Data
  public string SharedSecret { get; set; }              // Encrypted shared secret
  public string QrCodeUrl { get; set; }
  
  // Recovery codes (hashed)
  public List<RecoveryCode> RecoveryCodes { get; set; }
  
  // Backup methods
  public string BackupEmail { get; set; }
  public string BackupPhoneNumber { get; set; }
  
  // Timeline
  public DateTime CreatedAt { get; set; }
  public DateTime? EnabledAt { get; set; }
  public DateTime? LastUsedAt { get; set; }
  public DateTime? VerifiedAt { get; set; }
  
  // Audit
  public User User { get; set; }
}

public enum TwoFactorAuthType
{
  TOTP,          // Time-based One-Time Password (Authenticator App)
  SMS,           // SMS (future)
  Email          // Email verification (future)
}

// Recovery codes for account recovery
public class RecoveryCode
{
  public Guid Id { get; set; }
  public Guid TwoFactorAuthId { get; set; }
  public string CodeHash { get; set; }       // Bcrypt hashed
  public bool Used { get; set; }
  public DateTime? UsedAt { get; set; }
  public TwoFactorAuth TwoFactorAuth { get; set; }
}

// 2FA Session (temporary)
public class TwoFactorSession
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public string SharedSecret { get; set; }
  public List<string> RecoveryCodes { get; set; }
  public TwoFactorSessionStatus Status { get; set; }    // Pending, Verified, Confirmed
  public DateTime CreatedAt { get; set; }
  public DateTime ExpiresAt { get; set; }               // 15 minutos
}

public enum TwoFactorSessionStatus
{
  Pending,      // Setup iniciado, aguardando verificação
  Verified,     // Código TOTP verificado
  Confirmed     // Recovery codes confirmados
}

// 2FA Challenge (during login)
public class TwoFactorChallenge
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public string SessionToken { get; set; }              // JWT for temp access
  public DateTime CreatedAt { get; set; }
  public DateTime ExpiresAt { get; set; }               // 5 minutos
  public int AttemptCount { get; set; }
  public int MaxAttempts { get; set; } = 5;
}
```

### 1.2 PostgreSQL DDL

```sql
CREATE TABLE two_factor_auths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,                    -- 'TOTP', 'SMS', 'Email'
  is_enabled BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  shared_secret TEXT,                           -- AES-256 encrypted
  qr_code_url TEXT,
  backup_email VARCHAR(255),
  backup_phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  enabled_at TIMESTAMP,
  last_used_at TIMESTAMP,
  verified_at TIMESTAMP,
  
  CONSTRAINT one_active_2fa_per_user 
    CHECK ((SELECT COUNT(*) FROM two_factor_auths WHERE user_id = users.id AND is_enabled = TRUE) <= 1)
);

CREATE INDEX idx_2fa_user_id ON two_factor_auths(user_id);
CREATE INDEX idx_2fa_enabled ON two_factor_auths(user_id, is_enabled);

-- Recovery codes
CREATE TABLE recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  two_factor_auth_id UUID NOT NULL REFERENCES two_factor_auths(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,              -- Bcrypt hashed
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recovery_codes_2fa_id ON recovery_codes(two_factor_auth_id);
CREATE INDEX idx_recovery_codes_used ON recovery_codes(used);

-- 2FA Sessions (temporary)
CREATE TABLE two_factor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_secret TEXT,
  recovery_codes TEXT,                          -- JSON array
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  CONSTRAINT session_not_expired CHECK (expires_at > NOW())
);

CREATE INDEX idx_2fa_sessions_user_id ON two_factor_sessions(user_id);
CREATE INDEX idx_2fa_sessions_expires_at ON two_factor_sessions(expires_at);

-- 2FA Challenges (during login)
CREATE TABLE two_factor_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  CONSTRAINT attempts_not_exceeded CHECK (attempt_count <= max_attempts),
  CONSTRAINT challenge_not_expired CHECK (expires_at > NOW())
);

CREATE INDEX idx_2fa_challenges_user_id ON two_factor_challenges(user_id);
CREATE INDEX idx_2fa_challenges_token ON two_factor_challenges(session_token);
```

---

## 2. TWO-FACTOR AUTH SERVICE

```csharp
// Application/Services/TwoFactorAuthService.cs
public interface ITwoFactorAuthService
{
  Task<TwoFactorSetupDto> InitiateSetupAsync(Guid userId);
  Task<bool> VerifyTotpAsync(Guid userId, string code);
  Task<TwoFactorSetupResultDto> ConfirmSetupAsync(Guid userId, TwoFactorSetupConfirmRequest request);
  Task<bool> VerifyTwoFactorCodeAsync(Guid userId, string code);
  Task<TwoFactorChallengeDto> CreateChallengeAsync(Guid userId);
  Task<AuthenticationResultDto> VerifyChallengeAsync(Guid challengeId, string code);
  Task DisableAsync(Guid userId);
  Task<IEnumerable<RecoveryCodeDto>> RegenerateRecoveryCodesAsync(Guid userId);
}

public class TwoFactorAuthService : ITwoFactorAuthService
{
  private readonly ITwoFactorAuthRepository _twoFactorRepository;
  private readonly ITwoFactorSessionRepository _sessionRepository;
  private readonly ITwoFactorChallengeRepository _challengeRepository;
  private readonly IRecoveryCodeRepository _recoveryCodeRepository;
  private readonly IEncryptionService _encryptionService;
  private readonly IJwtService _jwtService;
  private readonly ILogger<TwoFactorAuthService> _logger;
  private const int SESSION_TIMEOUT_MINUTES = 15;
  private const int CHALLENGE_TIMEOUT_MINUTES = 5;
  private const int RECOVERY_CODE_COUNT = 10;
  private const int MAX_LOGIN_ATTEMPTS = 5;

  public TwoFactorAuthService(
    ITwoFactorAuthRepository twoFactorRepository,
    ITwoFactorSessionRepository sessionRepository,
    ITwoFactorChallengeRepository challengeRepository,
    IRecoveryCodeRepository recoveryCodeRepository,
    IEncryptionService encryptionService,
    IJwtService jwtService,
    ILogger<TwoFactorAuthService> logger)
  {
    _twoFactorRepository = twoFactorRepository;
    _sessionRepository = sessionRepository;
    _challengeRepository = challengeRepository;
    _recoveryCodeRepository = recoveryCodeRepository;
    _encryptionService = encryptionService;
    _jwtService = jwtService;
    _logger = logger;
  }

  // 1. INITIATE 2FA SETUP (First step: Generate secret + QR code)
  public async Task<TwoFactorSetupDto> InitiateSetupAsync(Guid userId)
  {
    // Generate shared secret using RFC 4226 (HOTP)
    var key = KeyGeneration.GenerateRandomKey(20);  // OTPNet library
    var sharedSecret = Base32Encoding.ToString(key);

    // Generate QR code
    var qrGenerator = new QRCodeGenerator();
    var qrCodeData = qrGenerator.CreateQrCode(
      $"otpauth://totp/Loja@loja.com.br?secret={sharedSecret}&issuer=Loja",
      QRCodeGenerator.ECCLevel.Q
    );
    var qrCodeImage = new BitmapByteQRCode(qrCodeData);
    var qrCodeBytes = qrCodeImage.GetGraphic(10);
    var qrCodeUrl = $"data:image/png;base64,{Convert.ToBase64String(qrCodeBytes)}";

    // Criar session temporária
    var session = new TwoFactorSession
    {
      UserId = userId,
      SharedSecret = _encryptionService.Encrypt(sharedSecret),
      Status = TwoFactorSessionStatus.Pending,
      CreatedAt = DateTime.UtcNow,
      ExpiresAt = DateTime.UtcNow.AddMinutes(SESSION_TIMEOUT_MINUTES)
    };

    await _sessionRepository.AddAsync(session);

    _logger.LogInformation("2FA setup initiated for user {userId}", userId);

    return new TwoFactorSetupDto
    {
      SessionId = session.Id,
      QrCodeUrl = qrCodeUrl,
      SharedSecret = sharedSecret,
      Instructions = "Escaneie o código QR com seu app autenticador (Google Authenticator, Authy, etc)",
      ExpiresIn = SESSION_TIMEOUT_MINUTES * 60  // seconds
    };
  }

  // 2. VERIFY TOTP CODE (User enters code from authenticator app)
  public async Task<bool> VerifyTotpAsync(Guid userId, string code)
  {
    // Get active 2FA session
    var session = await _sessionRepository.GetByUserAsync(userId);
    if (session == null || session.ExpiresAt < DateTime.UtcNow)
      throw new UnauthorizedException("2FA setup session expired");

    // Decrypt shared secret
    var sharedSecret = _encryptionService.Decrypt(session.SharedSecret);

    // Verify TOTP code
    var totp = new Totp(Base32Encoding.ToBytes(sharedSecret));
    if (!totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedWindow))
      return false;

    // Mark session as verified
    session.Status = TwoFactorSessionStatus.Verified;
    await _sessionRepository.UpdateAsync(session);

    _logger.LogInformation("TOTP verified for user {userId}", userId);
    return true;
  }

  // 3. GENERATE & DISPLAY RECOVERY CODES
  private List<string> GenerateRecoveryCodes(int count = RECOVERY_CODE_COUNT)
  {
    var codes = new List<string>();
    var random = new Random();

    for (int i = 0; i < count; i++)
    {
      // Formato: XXXX-XXXX-XXXX (12 caracteres)
      var code = string.Empty;
      for (int j = 0; j < 3; j++)
      {
        code += random.Next(0, 10000).ToString("D4") + "-";
      }
      code = code.TrimEnd('-');
      codes.Add(code);
    }

    return codes;
  }

  // 4. CONFIRM 2FA SETUP (Final step: Save 2FA + recovery codes)
  public async Task<TwoFactorSetupResultDto> ConfirmSetupAsync(
    Guid userId,
    TwoFactorSetupConfirmRequest request)
  {
    // Get verified session
    var session = await _sessionRepository.GetByUserAsync(userId);
    if (session == null || session.Status != TwoFactorSessionStatus.Verified)
      throw new UnauthorizedException("2FA verification incomplete");

    // Generate recovery codes
    var recoveryCodes = GenerateRecoveryCodes(RECOVERY_CODE_COUNT);

    // Create 2FA record
    var twoFactor = new TwoFactorAuth
    {
      UserId = userId,
      Type = TwoFactorAuthType.TOTP,
      IsEnabled = true,
      IsVerified = true,
      SharedSecret = session.SharedSecret,  // Already encrypted
      EnabledAt = DateTime.UtcNow,
      VerifiedAt = DateTime.UtcNow,
      RecoveryCodes = recoveryCodes.Select(code => new RecoveryCode
      {
        CodeHash = BCrypt.Net.BCrypt.HashPassword(code),  // Hash para segurança
        Used = false
      }).ToList()
    };

    await _twoFactorRepository.AddAsync(twoFactor);

    // Delete session
    await _sessionRepository.DeleteAsync(session.Id);

    _logger.LogInformation("2FA setup confirmed for user {userId}", userId);

    return new TwoFactorSetupResultDto
    {
      Message = "2FA ativado com sucesso",
      RecoveryCodes = recoveryCodes,
      Important = "Salve esses códigos em local seguro. Cada código pode ser usado uma vez."
    };
  }

  // 5. VERIFY 2FA CODE DURING LOGIN
  public async Task<bool> VerifyTwoFactorCodeAsync(Guid userId, string code)
  {
    var twoFactor = await _twoFactorRepository.GetByUserAsync(userId);
    if (twoFactor == null || !twoFactor.IsEnabled)
      throw new UnauthorizedException("2FA not enabled");

    // Decrypt shared secret
    var sharedSecret = _encryptionService.Decrypt(twoFactor.SharedSecret);

    // Verify TOTP code
    var totp = new Totp(Base32Encoding.ToBytes(sharedSecret));
    if (totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedWindow))
    {
      // Update last used timestamp
      twoFactor.LastUsedAt = DateTime.UtcNow;
      await _twoFactorRepository.UpdateAsync(twoFactor);

      _logger.LogInformation("2FA TOTP verified for user {userId}", userId);
      return true;
    }

    // Try recovery code
    var recoveryCode = twoFactor.RecoveryCodes.FirstOrDefault(rc =>
      !rc.Used && BCrypt.Net.BCrypt.Verify(code, rc.CodeHash)
    );

    if (recoveryCode != null)
    {
      recoveryCode.Used = true;
      recoveryCode.UsedAt = DateTime.UtcNow;
      await _twoFactorRepository.UpdateAsync(twoFactor);

      _logger.LogWarning("2FA recovery code used for user {userId}", userId);
      return true;
    }

    _logger.LogWarning("2FA verification failed for user {userId}", userId);
    return false;
  }

  // 6. CREATE 2FA CHALLENGE (During login, after email/password verified)
  public async Task<TwoFactorChallengeDto> CreateChallengeAsync(Guid userId)
  {
    var twoFactor = await _twoFactorRepository.GetByUserAsync(userId);
    if (twoFactor == null || !twoFactor.IsEnabled)
      throw new UnauthorizedException("2FA not enabled");

    // Criar temporary JWT para acesso parcial
    var tempToken = _jwtService.GenerateTemporaryToken(userId, "2fa");

    var challenge = new TwoFactorChallenge
    {
      UserId = userId,
      SessionToken = tempToken,
      CreatedAt = DateTime.UtcNow,
      ExpiresAt = DateTime.UtcNow.AddMinutes(CHALLENGE_TIMEOUT_MINUTES),
      AttemptCount = 0
    };

    await _challengeRepository.AddAsync(challenge);

    _logger.LogInformation("2FA challenge created for user {userId}", userId);

    return new TwoFactorChallengeDto
    {
      ChallengeId = challenge.Id,
      SessionToken = tempToken,
      ExpiresIn = CHALLENGE_TIMEOUT_MINUTES * 60
    };
  }

  // 7. VERIFY 2FA CHALLENGE & COMPLETE LOGIN
  public async Task<AuthenticationResultDto> VerifyChallengeAsync(
    Guid challengeId,
    string code)
  {
    var challenge = await _challengeRepository.GetByIdAsync(challengeId);
    if (challenge == null)
      throw new NotFoundException("Challenge not found");

    if (challenge.ExpiresAt < DateTime.UtcNow)
      throw new UnauthorizedException("Challenge expired");

    if (challenge.AttemptCount >= challenge.MaxAttempts)
      throw new UnauthorizedException("Maximum attempts exceeded");

    challenge.AttemptCount++;

    // Verify code
    if (!await VerifyTwoFactorCodeAsync(challenge.UserId, code))
    {
      await _challengeRepository.UpdateAsync(challenge);
      throw new UnauthorizedException("Invalid 2FA code");
    }

    // Generate final JWT token
    var user = await _userRepository.GetByIdAsync(challenge.UserId);
    var token = _jwtService.GenerateToken(user);

    // Delete challenge
    await _challengeRepository.DeleteAsync(challenge.Id);

    _logger.LogInformation("2FA challenge verified for user {userId}", challenge.UserId);

    return new AuthenticationResultDto
    {
      AccessToken = token,
      RefreshToken = _jwtService.GenerateRefreshToken(user.Id),
      ExpiresIn = 3600,
      User = new UserDto { Id = user.Id, Email = user.Email, Name = user.Name }
    };
  }

  // 8. DISABLE 2FA
  public async Task DisableAsync(Guid userId)
  {
    var twoFactor = await _twoFactorRepository.GetByUserAsync(userId);
    if (twoFactor == null)
      throw new NotFoundException("2FA not found");

    twoFactor.IsEnabled = false;
    await _twoFactorRepository.UpdateAsync(twoFactor);

    _logger.LogInformation("2FA disabled for user {userId}", userId);
  }

  // 9. REGENERATE RECOVERY CODES
  public async Task<IEnumerable<RecoveryCodeDto>> RegenerateRecoveryCodesAsync(Guid userId)
  {
    var twoFactor = await _twoFactorRepository.GetByUserAsync(userId);
    if (twoFactor == null || !twoFactor.IsEnabled)
      throw new UnauthorizedException("2FA not enabled");

    // Delete old codes
    _recoveryCodeRepository.DeleteByTwoFactorAuthAsync(twoFactor.Id);

    // Generate new codes
    var newCodes = GenerateRecoveryCodes(RECOVERY_CODE_COUNT);
    var codeEntities = newCodes.Select(code => new RecoveryCode
    {
      TwoFactorAuthId = twoFactor.Id,
      CodeHash = BCrypt.Net.BCrypt.HashPassword(code),
      Used = false
    }).ToList();

    foreach (var codeEntity in codeEntities)
      await _recoveryCodeRepository.AddAsync(codeEntity);

    _logger.LogInformation("Recovery codes regenerated for user {userId}", userId);

    return newCodes.Select(code => new RecoveryCodeDto { Code = code });
  }
}
```

---

## 3. API ENDPOINTS

```csharp
[ApiController]
[Route("api/v1/auth/2fa")]
[Authorize]
public class TwoFactorAuthController : ControllerBase
{
  private readonly ITwoFactorAuthService _twoFactorService;

  // POST /api/v1/auth/2fa/setup (Initiate setup)
  [HttpPost("setup")]
  public async Task<IActionResult> InitiateSetup()
  {
    var userId = User.GetUserId();
    var result = await _twoFactorService.InitiateSetupAsync(userId);
    return Ok(result);
  }

  // POST /api/v1/auth/2fa/verify (Verify TOTP code)
  [HttpPost("verify")]
  public async Task<IActionResult> VerifyTotp([FromBody] VerifyTotpRequest request)
  {
    var userId = User.GetUserId();
    var isValid = await _twoFactorService.VerifyTotpAsync(userId, request.Code);
    return Ok(new { valid = isValid });
  }

  // POST /api/v1/auth/2fa/confirm (Complete setup)
  [HttpPost("confirm")]
  public async Task<IActionResult> ConfirmSetup([FromBody] TwoFactorSetupConfirmRequest request)
  {
    var userId = User.GetUserId();
    var result = await _twoFactorService.ConfirmSetupAsync(userId, request);
    return Ok(result);
  }

  // DELETE /api/v1/auth/2fa (Disable 2FA)
  [HttpDelete]
  public async Task<IActionResult> Disable()
  {
    var userId = User.GetUserId();
    await _twoFactorService.DisableAsync(userId);
    return NoContent();
  }

  // POST /api/v1/auth/2fa/recovery-codes/regenerate
  [HttpPost("recovery-codes/regenerate")]
  public async Task<IActionResult> RegenerateRecoveryCodes()
  {
    var userId = User.GetUserId();
    var codes = await _twoFactorService.RegenerateRecoveryCodesAsync(userId);
    return Ok(new { codes });
  }

  // POST /api/v1/auth/2fa/challenge (Create challenge during login)
  [HttpPost("challenge")]
  [AllowAnonymous]
  public async Task<IActionResult> CreateChallenge([FromBody] CreateChallengeRequest request)
  {
    // This endpoint should be called after email/password verification
    // with a temporary JWT token
    var result = await _twoFactorService.CreateChallengeAsync(request.UserId);
    return Ok(result);
  }

  // POST /api/v1/auth/2fa/challenge/verify (Verify challenge)
  [HttpPost("challenge/verify")]
  [AllowAnonymous]
  public async Task<IActionResult> VerifyChallenge([FromBody] VerifyChallengeRequest request)
  {
    var result = await _twoFactorService.VerifyChallengeAsync(request.ChallengeId, request.Code);
    return Ok(result);
  }
}
```

---

## 4. FRONTEND 2FA SETUP WIZARD

```typescript
// src/app/(auth)/2fa-setup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import QRCode from 'qrcode.react';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [sessionId, setSessionId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [sharedSecret, setSharedSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Generate QR code
  const handleInitiateSetup = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/2fa/setup');
      setSessionId(response.data.sessionId);
      setQrCode(response.data.qrCodeUrl);
      setSharedSecret(response.data.sharedSecret);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify TOTP code
  const handleVerifyTotp = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/2fa/verify', {
        code: totpCode
      });

      if (response.data.valid) {
        setStep('backup');
      } else {
        setError('Invalid code. Try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Confirm setup & get recovery codes
  const handleConfirmSetup = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/2fa/confirm');
      setRecoveryCodes(response.data.recoveryCodes);
      setStep('backup');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm 2FA');
    } finally {
      setLoading(false);
    }
  };

  // Download recovery codes
  const downloadRecoveryCodes = () => {
    const text = recoveryCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-recovery-codes.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Ativar Autenticação em Dois Fatores</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {step === 'qr' && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Escaneie este código QR com seu app autenticador.
          </p>
          <button
            onClick={handleInitiateSetup}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Carregando...' : 'Começar'}
          </button>
        </div>
      )}

      {step === 'verify' && qrCode && (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded flex justify-center">
            <img src={qrCode} alt="QR Code" />
          </div>

          <p className="text-sm text-gray-600">
            Ou insira manualmente este código:
          </p>
          <code className="block bg-gray-100 p-2 text-sm text-center break-all">
            {sharedSecret}
          </code>

          <div>
            <label className="block text-sm font-medium mb-2">
              Código do Autenticador (6 dígitos)
            </label>
            <input
              type="text"
              maxLength="6"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full border border-gray-300 rounded px-3 py-2 text-center text-2xl tracking-widest"
            />
          </div>

          <button
            onClick={handleVerifyTotp}
            disabled={loading || totpCode.length !== 6}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Verificando...' : 'Verificar Código'}
          </button>
        </div>
      )}

      {step === 'backup' && recoveryCodes.length > 0 && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
            <p className="font-semibold text-yellow-900 mb-2">⚠️ Salve seus códigos de recuperação</p>
            <p className="text-sm text-yellow-800">
              Use esses códigos para acessar sua conta se perder acesso ao seu autenticador.
            </p>
          </div>

          <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-2">
            {recoveryCodes.map((code, idx) => (
              <div key={idx}>{code}</div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadRecoveryCodes}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Baixar
            </button>
            <button
              onClick={copyToClipboard}
              className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
            >
              Copiar
            </button>
          </div>

          <button
            onClick={() => router.push('/settings/security')}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Concluído
          </button>
        </div>
      )}

      {step === 'backup' && recoveryCodes.length === 0 && (
        <button
          onClick={handleConfirmSetup}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processando...' : 'Próximo'}
        </button>
      )}
    </div>
  );
}
```

---

## 5. LOGIN FLOW WITH 2FA

```typescript
// src/app/(auth)/login/page.tsx (Modified for 2FA)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import TwoFactorVerification from '@/components/auth/TwoFactorVerification';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.requiresTwoFactor) {
        // User has 2FA enabled
        setChallengeId(response.data.challengeId);
        setSessionToken(response.data.sessionToken);
        setTwoFactorRequired(true);
      } else {
        // No 2FA, login successful
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (twoFactorRequired) {
    return (
      <TwoFactorVerification
        challengeId={challengeId}
        sessionToken={sessionToken}
        onSuccess={() => router.push('/dashboard')}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Login</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Entrando...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

```typescript
// src/components/auth/TwoFactorVerification.tsx
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface TwoFactorVerificationProps {
  challengeId: string;
  sessionToken: string;
  onSuccess: () => void;
}

export default function TwoFactorVerification({
  challengeId,
  sessionToken,
  onSuccess
}: TwoFactorVerificationProps) {
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post(
        '/auth/2fa/challenge/verify',
        {
          challengeId,
          code: useRecoveryCode ? recoveryCode : code
        },
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        }
      );

      // Save tokens
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">Verificação em Dois Fatores</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {!useRecoveryCode ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Insira o código de 6 dígitos do seu autenticador
          </p>

          <input
            type="text"
            maxLength="6"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full border border-gray-300 rounded px-3 py-2 text-center text-2xl tracking-widest"
          />

          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>

          <button
            type="button"
            onClick={() => setUseRecoveryCode(true)}
            className="w-full text-blue-600 hover:underline text-sm"
          >
            Usar código de recuperação
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">
            Insira um de seus códigos de recuperação
          </p>

          <input
            type="text"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />

          <button
            onClick={handleVerify}
            disabled={loading || recoveryCode.length < 10}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>

          <button
            type="button"
            onClick={() => setUseRecoveryCode(false)}
            className="w-full text-blue-600 hover:underline text-sm"
          >
            Voltar ao código do autenticador
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 6. 2FA CHECKLIST

```markdown
## Implementation Checklist

### Database
- [ ] Migration: two_factor_auths table
- [ ] Migration: recovery_codes table
- [ ] Migration: two_factor_sessions table
- [ ] Migration: two_factor_challenges table

### Backend
- [ ] TwoFactorAuth entity
- [ ] RecoveryCode entity
- [ ] TwoFactorSession entity
- [ ] TwoFactorChallenge entity
- [ ] ITwoFactorAuthService interface
- [ ] TwoFactorAuthService implementation
- [ ] TwoFactorAuthController
- [ ] TOTP verification logic
- [ ] Recovery code generation
- [ ] QR code generation

### Frontend
- [ ] 2FA setup page (QR code scanning)
- [ ] TOTP code input
- [ ] Recovery codes display & download
- [ ] Login with 2FA challenge
- [ ] Recovery code option
- [ ] 2FA settings page (enable/disable)

### API Endpoints
- [ ] POST /auth/2fa/setup
- [ ] POST /auth/2fa/verify
- [ ] POST /auth/2fa/confirm
- [ ] POST /auth/2fa/challenge
- [ ] POST /auth/2fa/challenge/verify
- [ ] DELETE /auth/2fa
- [ ] POST /auth/2fa/recovery-codes/regenerate

### Testing
- [ ] Unit: TOTP generation and verification
- [ ] Unit: Recovery code generation and hashing
- [ ] Integration: Setup flow
- [ ] Integration: Login with 2FA
- [ ] E2E: Full setup and login flow

### Security
- [ ] Shared secret encrypted in database
- [ ] Recovery codes hashed with Bcrypt
- [ ] Challenge tokens expire after 5 minutes
- [ ] Max 5 attempts per challenge
- [ ] Rate limiting on verification endpoint
```

---

**2FA & MFA Implementation Completo ✅**
