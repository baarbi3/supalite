import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import * as bcyrypt from "bcrypt";
import { randomBytes } from "crypto";
import slugify from "slugify";
import { eq } from "drizzle-orm";
import { COOKIE_KEYS } from "@supalite/constants";
import { DrizzleService } from "../db/drizzle.service";
import { organizations, orgMembers, users } from "../db/schema";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { from } from "rxjs";

@Injectable()
export class AuthService {
  constructor (
    private drizzle: DrizzleService,
    private jwtService: JwtService,
    private configService: ConfigService,
    
  ) {

  }

  setTokenCookies( res: Response, tokens: { accessToken: string; refreshToken: string }){
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    res.cookie(COOKIE_KEYS.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie(COOKIE_KEYS.REFRESH_TOEKN, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
  }

  clearTokenCookiess( res: Response ){
    res.clearCookie(COOKIE_KEYS.ACCESS_TOKEN)
    res.clearCookie(COOKIE_KEYS.REFRESH_TOEKN)
  }

  // Slug helper
  private generateOrgSlug (name: string): string {
    const base = slugify(`${name}-org`, { lower: true, strict: true });
    const suffix = randomBytes(3).toString('hex');

    return `${base}-${suffix}`;
  }

  // JWT signing

  private signTokens(userId: string, email: string){
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_ACCESS_SECRET"),
      expiresIn: this.configService.get("JWT_ACCESS_EXPIRES_IN")
    }); 

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get("JWT_REFRESH_EXPIRES_IN")
    });

    return { accessToken, refreshToken }
  }

  // Email + Password
  async register (dto: RegisterDto) {
    const existing = await this.drizzle.db
    .select()
    .from(users)
    .where(eq(users.email, dto.email))
    .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await bcyrypt.hash(dto.password, 12);

    const [user] = await this.drizzle.db
    .insert(users)
    .values({ email: dto.email, name: dto.name, passwordHash })
    .returning();

    const [org] = await this.drizzle.db
    .insert(organizations)
    .values({
      name: `${dto.name}'s Org`,
      slug: this.generateOrgSlug(dto.name),
    })
    .returning();

    await this.drizzle.db.insert(orgMembers).values({
      orgId: org.id,
      userId: user.id,
      role: 'admin',
    })

    return this.signTokens(user.id, user.email);
  }

  async login (dto: LoginDto) {
    const [user] = await this.drizzle.db
    .select()
    .from(users)
    .where(eq(users.email, dto.email))
    .limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const passwordMatch = await bcyrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid Credentials')
    }

    return this.signTokens(user.id, user.email);
  }
}