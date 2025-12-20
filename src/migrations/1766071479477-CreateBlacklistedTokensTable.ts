import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBlacklistedTokensTable1712345678901 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'blacklisted_tokens',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'token',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Индекс для быстрого поиска по токену
    await queryRunner.createIndex(
      'blacklisted_tokens',
      new TableIndex({
        name: 'IDX_BLACKLISTED_TOKEN',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    // Индекс для поиска по пользователю
    await queryRunner.createIndex(
      'blacklisted_tokens',
      new TableIndex({
        name: 'IDX_BLACKLISTED_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    // Индекс для очистки истекших токенов
    await queryRunner.createIndex(
      'blacklisted_tokens',
      new TableIndex({
        name: 'IDX_BLACKLISTED_EXPIRES_AT',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('blacklisted_tokens');
  }
}